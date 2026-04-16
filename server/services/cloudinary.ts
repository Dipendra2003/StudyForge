import { v2 as cloudinary } from 'cloudinary';
import { Logger, LogCategory } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  private static instance: CloudinaryService;
  private isConfigured: boolean = false;

  private constructor() {
    this.checkConfiguration();
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  private checkConfiguration(): void {
    const { cloud_name, api_key, api_secret } = cloudinary.config();
    
    if (cloud_name && api_key && api_secret) {
      this.isConfigured = true;
      Logger.info(LogCategory.SYSTEM, 'Cloudinary service configured successfully');
    } else {
      this.isConfigured = false;
      Logger.warn(LogCategory.SYSTEM, 'Cloudinary not configured - using base64 storage fallback');
    }
  }

  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload image to Cloudinary with retry logic
   * @param buffer - Image buffer from multer
   * @param options - Upload options
   * @returns Cloudinary URL
   */
  public async uploadImage(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      transformation?: any;
      retries?: number;
    } = {}
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    const maxRetries = options.retries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'studyforge';
        
        // Convert buffer to base64 for upload
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(base64Image, {
          folder,
          public_id: options.publicId,
          transformation: options.transformation || [
            { width: 500, height: 500, crop: 'limit' }, // Limit max size
            { quality: 'auto' }, // Auto quality optimization
            { fetch_format: 'auto' }, // Auto format (WebP when supported)
          ],
          resource_type: 'image',
          timeout: 60000, // 60 second timeout
        });

        Logger.info(LogCategory.SYSTEM, 'Image uploaded to Cloudinary', {
          publicId: result.public_id,
          url: result.secure_url,
          attempt,
          bytes: result.bytes,
          format: result.format,
        });

        return result.secure_url;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(LogCategory.SYSTEM, `Cloudinary upload attempt ${attempt} failed`, {
          error,
          attempt,
          maxRetries,
        });

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    Logger.error(LogCategory.SYSTEM, 'Failed to upload image to Cloudinary after retries', lastError!);
    throw new Error(`Failed to upload image to Cloudinary after ${maxRetries} attempts`);
  }

  /**
   * Delete image from Cloudinary with retry logic
   * @param publicId - Public ID of the image
   */
  public async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      return; // Silently skip if not configured
    }

    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        Logger.info(LogCategory.SYSTEM, 'Image deleted from Cloudinary', { 
          publicId,
          result: result.result,
        });
        return;
      } catch (error) {
        Logger.warn(LogCategory.SYSTEM, `Cloudinary delete attempt ${attempt} failed`, {
          error,
          publicId,
          attempt,
        });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    Logger.error(LogCategory.SYSTEM, 'Failed to delete image from Cloudinary after retries', { publicId });
    // Don't throw error - deletion failure shouldn't break the flow
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  public extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    try {
      // Extract public ID from URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
      const parts = url.split('/');
      const uploadIndex = parts.indexOf('upload');
      
      if (uploadIndex === -1) return null;
      
      // Get everything after 'upload/v123456789/'
      const pathParts = parts.slice(uploadIndex + 2); // Skip 'upload' and version
      const publicIdWithExt = pathParts.join('/');
      
      // Remove file extension
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
      
      return publicId;
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Failed to extract public ID from URL', { url, error });
      return null;
    }
  }

  /**
   * Upload profile picture with optimizations
   * @param buffer - Image buffer
   * @param userId - User ID for unique naming
   * @returns Cloudinary URL
   */
  public async uploadProfilePicture(buffer: Buffer, userId: number): Promise<string> {
    return this.uploadImage(buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'studyforge'}/profiles`,
      publicId: `user_${userId}_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Square crop with face detection
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  }
}

export const cloudinaryService = CloudinaryService.getInstance();
