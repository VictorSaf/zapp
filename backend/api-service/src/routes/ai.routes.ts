import { Router } from 'express';
import { aiProviderService } from '../services/ai-provider.service';
import { ollamaService } from '../services/ollama.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

/**
 * GET /api/ai/providers - Get available AI providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = await aiProviderService.getAvailableProviders();
    const providerTests = await aiProviderService.testProviders();
    
    res.json({
      success: true,
      data: {
        available: providers,
        status: providerTests,
      },
    });
  } catch (error: any) {
    console.error('Failed to get AI providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI providers',
    });
  }
});

/**
 * GET /api/ai/models - Get available models
 */
router.get('/models', async (req, res) => {
  try {
    const models = await ollamaService.listModels();
    const recommendedModels = ollamaService.getRecommendedModels();
    
    res.json({
      success: true,
      data: {
        models: models.map(model => ({
          name: model.name,
          size: model.size,
          modified_at: model.modified_at,
        })),
        recommended: recommendedModels,
      },
    });
  } catch (error: any) {
    console.error('Failed to get AI models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI models',
    });
  }
});

/**
 * POST /api/ai/models/:modelName/pull - Download a model
 */
router.post('/models/:modelName/pull', async (req, res) => {
  try {
    const { modelName } = req.params;
    
    // Check if model is already available
    const isAvailable = await ollamaService.isModelAvailable(modelName);
    if (isAvailable) {
      res.json({
        success: true,
        data: { message: `Model ${modelName} is already available` },
      });
      return;
    }
    
    // Download the model
    await ollamaService.pullModel(modelName);
    
    res.json({
      success: true,
      data: { message: `Model ${modelName} downloaded successfully` },
    });
  } catch (error: any) {
    console.error(`Failed to pull model ${req.params.modelName}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to download model: ${req.params.modelName}`,
    });
  }
});

/**
 * POST /api/ai/test - Test AI generation
 */
router.post('/test', async (req, res) => {
  try {
    const { message, model, provider } = req.body;
    
    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }
    
    // Default test configuration
    const testConfig = {
      primary_model: model || 'llama3.2',
      local_model: model || 'llama3.2',
      temperature: 0.7,
      max_tokens: 500,
    };
    
    // Generate response
    const response = await aiProviderService.generateResponse(
      testConfig,
      [{ role: 'user', content: message }]
    );
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('AI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI test failed',
    });
  }
});

/**
 * POST /api/ai/chat - Generate AI chat response
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, agent_config, system_prompt } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({
        success: false,
        error: 'Messages array is required',
      });
      return;
    }
    
    // Default configuration if none provided
    const defaultConfig = {
      primary_model: 'gpt-4',
      local_model: 'llama3.2',
      temperature: 0.7,
      max_tokens: 2000,
    };
    
    const config = agent_config || defaultConfig;
    
    // Generate response
    const response = await aiProviderService.generateResponse(
      config,
      messages,
      system_prompt
    );
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('AI chat failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI chat failed',
    });
  }
});

/**
 * GET /api/ai/health - Check AI services health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      ollama: {
        available: await ollamaService.isAvailable(),
        models_count: 0,
        test_passed: false,
      },
      providers: await aiProviderService.testProviders(),
    };
    
    // Get models count
    try {
      const models = await ollamaService.listModels();
      health.ollama.models_count = models.length;
    } catch (error) {
      console.warn('Failed to get models count:', error);
    }
    
    // Test connection
    try {
      health.ollama.test_passed = await ollamaService.testConnection();
    } catch (error) {
      console.warn('Ollama connection test failed:', error);
    }
    
    const allHealthy = health.ollama.available && health.ollama.test_passed;
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: health,
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    });
  }
});

export default router;