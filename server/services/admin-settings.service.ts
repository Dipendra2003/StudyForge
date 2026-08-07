import { db } from '../db/index';
import { systemSettings, type SystemSettings, type InsertSystemSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { Logger, LogCategory } from '../utils/logger';

export class AdminSettingsService {
  private cachedSettings: SystemSettings | null = null;
  private lastFetchTime = 0;
  private readonly cacheDurationMs = 30000; // 30 seconds cache for performance

  /**
   * Get system settings from database with in-memory caching
   */
  async getSettings(forceRefresh = false): Promise<SystemSettings> {
    const now = Date.now();
    if (!forceRefresh && this.cachedSettings && (now - this.lastFetchTime < this.cacheDurationMs)) {
      return this.cachedSettings;
    }

    try {
      if (!db) {
        // Safe default if database is temporarily unavailable during boot
        return this.getDefaultSettingsObject();
      }

      const rows = await db.select().from(systemSettings).limit(1);
      if (rows && rows.length > 0) {
        this.cachedSettings = rows[0];
        this.lastFetchTime = now;
        return rows[0];
      }

      // If table is empty, insert default row
      const defaultData: InsertSystemSettings = {
        aiModel: "gemini-3.1-flash-lite-preview",
        fallbackAiModel: "gemini-2.5-flash",
        tokenBudget: 500000,
        autoQuarantine: true,
        toxicityThreshold: "0.85",
        maintenanceMode: false,
        jwtStrictRotation: true,
        senderEmail: "notifications@studyforge.edu"
      };

      const inserted = await db.insert(systemSettings).values(defaultData).returning();
      if (inserted && inserted[0]) {
        this.cachedSettings = inserted[0];
        this.lastFetchTime = now;
        return inserted[0];
      }
    } catch (error: any) {
      Logger.error(LogCategory.DATABASE, 'Failed to fetch system settings', { error: error?.message });
    }

    return this.getDefaultSettingsObject();
  }

  /**
   * Update system settings in PostgreSQL and invalidate memory cache
   */
  async updateSettings(updates: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings(true);
    
    if (!db) {
      throw new Error('Database connection uninitialized');
    }

    const updatedRows = await db
      .update(systemSettings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(systemSettings.id, current.id))
      .returning();

    if (updatedRows && updatedRows.length > 0) {
      this.cachedSettings = updatedRows[0];
      this.lastFetchTime = Date.now();
      Logger.info(LogCategory.AUTH, 'System enterprise settings updated by Admin', { updates });
      return updatedRows[0];
    }

    throw new Error('Failed to update system settings record');
  }

  /**
   * Helper for GeminiService to quickly get active AI models without latency
   */
  async getActiveAiModels(): Promise<{ primary: string; fallback: string }> {
    const config = await this.getSettings();
    return {
      primary: config.aiModel || 'gemini-3.1-flash-lite-preview',
      fallback: config.fallbackAiModel || 'gemini-2.5-flash'
    };
  }

  /**
   * Dynamically fetch all available Gemini models using active GEMINI_API_KEY
   */
  async listAvailableModels(): Promise<{ models: string[]; defaultModel: string }> {
    const defaultList = [
      'gemini-3.1-flash-lite-preview',
      'gemini-3.0-pro',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.models)) {
            const fetchedModels: string[] = [];
            for (const item of data.models) {
              const methods = item.supportedGenerationMethods || [];
              if (methods.includes('generateContent') && item.name) {
                // Strip "models/" prefix if present
                const name = item.name.replace(/^models\//, '');
                if (name.toLowerCase().includes('gemini')) {
                  fetchedModels.push(name);
                }
              }
            }

            // Merge fetched models with default top models and deduplicate
            const combined = Array.from(new Set([...fetchedModels, ...defaultList]));
            return {
              models: combined.sort(),
              defaultModel: 'gemini-3.1-flash-lite-preview'
            };
          }
        }
      }
    } catch (err: any) {
      Logger.warn(LogCategory.AI, 'Failed to dynamically fetch Google AI models, returning fallback set', { error: err?.message });
    }

    return {
      models: defaultList.sort(),
      defaultModel: 'gemini-3.1-flash-lite-preview'
    };
  }

  private getDefaultSettingsObject(): SystemSettings {
    return {
      id: 1,
      aiModel: "gemini-3.1-flash-lite-preview",
      fallbackAiModel: "gemini-2.5-flash",
      tokenBudget: 500000,
      autoQuarantine: true,
      toxicityThreshold: "0.85",
      maintenanceMode: false,
      jwtStrictRotation: true,
      senderEmail: "notifications@studyforge.edu",
      updatedAt: new Date()
    };
  }
}

export const adminSettingsService = new AdminSettingsService();
