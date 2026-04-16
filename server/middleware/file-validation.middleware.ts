import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { Logger, LogCategory } from '../utils/logger';
import { virusScanService } from '../services/virus-scan.service';

// Allowed file types with their magic numbers
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const ALLOWED_DOCUMENT_TYPES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // ZIP format
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0], // DOC
  'text/plain': null, // No magic number for plain text
  'text/rtf': [0x7B, 0x5C, 0x72, 0x74, 0x66], // {\rtf
  'application/rtf': [0x7B, 0x5C, 0x72, 0x74, 0x66],
};

/**
 * Validate file type using magic numbers (file headers)
 */
export async function validateFileType(
  buffer: Buffer,
  allowedTypes: Record<string, number[] | null>,
  declaredMimeType: string
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  try {
    // Use file-type library for accurate detection
    const fileType = await fileTypeFromBuffer(buffer);
    
    // For plain text files, file-type might return undefined
    if (!fileType && declaredMimeType === 'text/plain') {
      // Basic validation for text files - check if it's valid UTF-8
      try {
        buffer.toString('utf-8');
        return { valid: true, detectedType: 'text/plain' };
      } catch {
        return { valid: false, error: 'Invalid text file encoding' };
      }
    }

    if (!fileType) {
      return { valid: false, error: 'Unable to detect file type' };
    }

    // Check if detected type is in allowed list
    const detectedMime = fileType.mime;
    if (!allowedTypes[detectedMime]) {
      return {
        valid: false,
        detectedType: detectedMime,
        error: `File type ${detectedMime} is not allowed`,
      };
    }

    // Verify declared MIME type matches detected type (prevent spoofing)
    if (declaredMimeType !== detectedMime && declaredMimeType !== 'text/plain') {
      Logger.security('MIME type mismatch detected', {
        declared: declaredMimeType,
        detected: detectedMime,
      });
      
      // Allow if detected type is in allowed list (more trustworthy than declared)
      if (allowedTypes[detectedMime]) {
        return { valid: true, detectedType: detectedMime };
      }
      
      return {
        valid: false,
        detectedType: detectedMime,
        error: 'File type mismatch - possible spoofing attempt',
      };
    }

    return { valid: true, detectedType: detectedMime };
  } catch (error) {
    Logger.error(LogCategory.SECURITY, 'File type validation error', error as Error);
    return { valid: false, error: 'File validation failed' };
  }
}

/**
 * Middleware to validate image uploads
 */
export async function validateImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.file) {
    return next();
  }

  const { buffer, mimetype, originalname, size } = req.file;

  Logger.debug(LogCategory.SECURITY, 'Validating image upload', {
    fileName: originalname,
    declaredType: mimetype,
    size,
  });

  // Validate file size
  const maxSize = parseInt(process.env.MAX_IMAGE_SIZE_MB || '5') * 1024 * 1024;
  if (size > maxSize) {
    Logger.security('Image upload rejected - file too large', {
      fileName: originalname,
      size,
      maxSize,
    });
    res.status(413).json({
      message: 'File too large',
      error: `Maximum file size is ${maxSize / 1024 / 1024}MB`,
      maxSizeMB: maxSize / 1024 / 1024,
    });
    return;
  }

  // Validate file type using magic numbers
  const validation = await validateFileType(buffer, ALLOWED_IMAGE_TYPES, mimetype);

  if (!validation.valid) {
    Logger.security('Image upload rejected - invalid file type', {
      fileName: originalname,
      declaredType: mimetype,
      detectedType: validation.detectedType,
      error: validation.error,
    });
    res.status(400).json({
      message: 'Invalid file type',
      error: validation.error || 'Only JPEG, PNG, GIF, and WebP images are allowed',
      detectedType: validation.detectedType,
    });
    return;
  }

  Logger.debug(LogCategory.SECURITY, 'Image validation passed', {
    fileName: originalname,
    detectedType: validation.detectedType,
  });

  next();
}

/**
 * Middleware to validate document uploads
 */
export async function validateDocumentUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.file) {
    return next();
  }

  const { buffer, mimetype, originalname, size } = req.file;

  Logger.debug(LogCategory.SECURITY, 'Validating document upload', {
    fileName: originalname,
    declaredType: mimetype,
    size,
  });

  // Validate file size
  const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
  if (size > maxSize) {
    Logger.security('Document upload rejected - file too large', {
      fileName: originalname,
      size,
      maxSize,
    });
    res.status(413).json({
      message: 'File too large',
      error: `Maximum file size is ${maxSize / 1024 / 1024}MB`,
      maxSizeMB: maxSize / 1024 / 1024,
    });
    return;
  }

  // Validate file type using magic numbers
  const validation = await validateFileType(buffer, ALLOWED_DOCUMENT_TYPES, mimetype);

  if (!validation.valid) {
    Logger.security('Document upload rejected - invalid file type', {
      fileName: originalname,
      declaredType: mimetype,
      detectedType: validation.detectedType,
      error: validation.error,
    });
    res.status(400).json({
      message: 'Invalid file type',
      error: validation.error || 'Only PDF, Word, TXT, and RTF documents are allowed',
      detectedType: validation.detectedType,
    });
    return;
  }

  Logger.debug(LogCategory.SECURITY, 'Document validation passed', {
    fileName: originalname,
    detectedType: validation.detectedType,
  });

  next();
}

/**
 * Middleware to validate file uploads with virus scanning
 */
export async function validateWithVirusScan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.file) {
    return next();
  }

  const { buffer, originalname } = req.file;

  try {
    // Check if virus scanning is available
    const isAvailable = await virusScanService.isAvailable();
    
    if (!isAvailable) {
      Logger.warn(LogCategory.SECURITY, 'Virus scan skipped - service not available', {
        fileName: originalname,
      });
      return next();
    }

    // Scan the file
    const scanResult = await virusScanService.scanBuffer(buffer, originalname);

    if (scanResult.isInfected) {
      Logger.security('Malicious file upload blocked', {
        fileName: originalname,
        viruses: scanResult.viruses,
      });
      res.status(400).json({
        message: 'File rejected - security threat detected',
        error: scanResult.message,
        viruses: scanResult.viruses,
      });
      return;
    }

    Logger.debug(LogCategory.SECURITY, 'Virus scan passed', {
      fileName: originalname,
    });

    next();
  } catch (error) {
    Logger.error(LogCategory.SECURITY, 'Virus scan middleware error', error as Error);
    // Allow file through if scanning fails (unless strict mode)
    if (process.env.VIRUS_SCAN_STRICT === 'true') {
      res.status(500).json({
        message: 'Unable to scan file',
        error: 'Virus scanning service unavailable',
      });
      return;
    }
    next();
  }
}
