/**
 * Admin Enterprise System Settings & AI Model Routing Routes
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminSettingsService } from '../../services/admin-settings.service';
import { Logger, LogCategory } from '../../utils/logger';

const router = Router();

// Secure all endpoints to verified admins only
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/settings
 * Retrieve active system enterprise configurations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await adminSettingsService.getSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    Logger.error(LogCategory.AUTH, 'Error retrieving system settings', { error: error?.message });
    return res.status(500).json({ success: false, message: 'Failed to retrieve system settings' });
  }
});

/**
 * GET /api/admin/settings/available-models
 * Auto-fetch available generative models directly from Google Gemini APIs
 */
router.get('/available-models', async (req: Request, res: Response) => {
  try {
    const modelsData = await adminSettingsService.listAvailableModels();
    return res.status(200).json({ success: true, ...modelsData });
  } catch (error: any) {
    Logger.error(LogCategory.AI, 'Error listing available AI models', { error: error?.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch available AI models' });
  }
});

/**
 * PUT /api/admin/settings
 * Persist administrator modifications to PostgreSQL
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body || {};
    const updated = await adminSettingsService.updateSettings(updates);
    return res.status(200).json({ success: true, message: 'Settings saved successfully', data: updated });
  } catch (error: any) {
    Logger.error(LogCategory.AUTH, 'Error saving system settings', { error: error?.message });
    return res.status(500).json({ success: false, message: error?.message || 'Failed to update system settings' });
  }
});

export default router;
