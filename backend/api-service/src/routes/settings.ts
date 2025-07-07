import { Router, Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settingsService';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler';
import { createError } from '../middleware/errorHandler';
import { UpdateSettingsRequest } from '../types/settings';

const router = Router();
const settingsService = new SettingsService();

// Admin check middleware
const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.is_admin) {
    throw createError('Access denied. Admin privileges required.', 403);
  }
  next();
};

/**
 * @route   GET /api/settings
 * @desc    Get current application settings
 * @access  Admin only
 */
router.get('/', authMiddleware, adminOnly, asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await settingsService.getSettings();
  res.json({
    success: true,
    data: settings
  });
}));

/**
 * @route   PUT /api/settings
 * @desc    Update application settings
 * @access  Admin only
 */
router.put('/', authMiddleware, adminOnly, asyncHandler(async (req: AuthRequest, res: Response) => {
  const updates: UpdateSettingsRequest = req.body;
  const userId = req.user!.id;
  
  const updatedSettings = await settingsService.updateSettings(updates, userId);
  
  res.json({
    success: true,
    data: updatedSettings,
    message: 'Settings updated successfully'
  });
}));

/**
 * @route   GET /api/settings/features
 * @desc    Get feature flags (public)
 * @access  Public
 */
router.get('/features', asyncHandler(async (req: Request, res: Response) => {
  const features = await settingsService.getFeatureFlags();
  res.json({
    success: true,
    data: features
  });
}));

/**
 * @route   GET /api/settings/maintenance
 * @desc    Check maintenance mode status
 * @access  Public
 */
router.get('/maintenance', asyncHandler(async (req: Request, res: Response) => {
  const isMaintenanceMode = await settingsService.isMaintenanceMode();
  res.json({
    success: true,
    data: { maintenance_mode: isMaintenanceMode }
  });
}));

/**
 * @route   GET /api/settings/ai-models
 * @desc    Get available AI models configuration
 * @access  Private
 */
router.get('/ai-models', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const aiModels = await settingsService.getAIModelConfig();
  
  // Remove sensitive data like API keys
  const safeConfig = {
    default_model: aiModels.default_model,
    ollama_enabled: aiModels.ollama_enabled,
    openai_enabled: aiModels.openai_enabled,
    claude_enabled: aiModels.claude_enabled,
    ollama_config: aiModels.ollama_config ? {
      base_url: aiModels.ollama_config.base_url,
      models: aiModels.ollama_config.models
    } : undefined
  };
  
  res.json({
    success: true,
    data: safeConfig
  });
}));

export default router;