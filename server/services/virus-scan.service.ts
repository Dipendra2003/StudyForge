import NodeClam from 'clamscan';
import { Readable } from 'stream';
import { Logger, LogCategory } from '../utils/logger';

export class VirusScanService {
  private static instance: VirusScanService;
  private clamScan: NodeClam | null = null;
  private isConfigured: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.initializationPromise = this.initialize();
  }

  public static getInstance(): VirusScanService {
    if (!VirusScanService.instance) {
      VirusScanService.instance = new VirusScanService();
    }
    return VirusScanService.instance;
  }

  private async initialize(): Promise<void> {
    const enableVirusScan = process.env.ENABLE_VIRUS_SCAN === 'true';
    
    if (!enableVirusScan) {
      Logger.info(LogCategory.SYSTEM, 'Virus scanning is disabled');
      this.isConfigured = false;
      return;
    }

    try {
      this.clamScan = await new NodeClam().init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: undefined,
        debugMode: process.env.NODE_ENV === 'development',
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
          timeout: 60000,
          localFallback: false,
        },
        preference: 'clamdscan',
      });

      this.isConfigured = true;
      Logger.info(LogCategory.SYSTEM, 'Virus scanning service initialized successfully');
    } catch (error) {
      this.isConfigured = false;
      Logger.warn(LogCategory.SYSTEM, 'Virus scanning service not available - ClamAV daemon not running', { error });
    }
  }

  public async isAvailable(): Promise<boolean> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.isConfigured;
  }

  public async scanBuffer(buffer: Buffer, fileName: string): Promise<{
    isInfected: boolean;
    viruses: string[];
    message: string;
  }> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.isConfigured || !this.clamScan) {
      Logger.warn(LogCategory.SECURITY, 'Virus scan skipped - service not available', { fileName });
      return {
        isInfected: false,
        viruses: [],
        message: 'Virus scanning not available',
      };
    }

    try {
      Logger.debug(LogCategory.SECURITY, 'Starting virus scan', {
        fileName,
        fileSize: buffer.length,
      });

      const stream = Readable.from(buffer);
      const result = await this.clamScan.scanStream(stream);
      const isInfected = result.isInfected || false;
      const viruses = result.viruses || [];

      if (isInfected) {
        Logger.security('Virus detected in uploaded file', {
          fileName,
          viruses,
          fileSize: buffer.length,
        });

        return {
          isInfected: true,
          viruses: viruses,
          message: `Virus detected: ${viruses.join(', ') || 'Unknown threat'}`,
        };
      }

      Logger.debug(LogCategory.SECURITY, 'File scan completed - clean', { fileName });

      return {
        isInfected: false,
        viruses: [],
        message: 'File is clean',
      };
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Virus scan failed', error as Error, { fileName });
      
      if (process.env.VIRUS_SCAN_STRICT === 'true') {
        return {
          isInfected: true,
          viruses: ['SCAN_ERROR'],
          message: 'Unable to scan file - rejected for security',
        };
      }

      return {
        isInfected: false,
        viruses: [],
        message: 'Scan failed - file allowed (non-strict mode)',
      };
    }
  }

  public async checkHealth(): Promise<boolean> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.isConfigured || !this.clamScan) {
      return false;
    }

    try {
      const version = await this.clamScan.getVersion();
      Logger.debug(LogCategory.SYSTEM, 'ClamAV health check passed', { version });
      return true;
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'ClamAV health check failed', error as Error);
      return false;
    }
  }
}

export const virusScanService = VirusScanService.getInstance();
export default virusScanService;
