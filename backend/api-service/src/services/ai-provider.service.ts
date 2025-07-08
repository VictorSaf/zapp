import axios from 'axios';
import { ollamaService, OllamaMessage } from './ollama.service';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AIModelConfig {
  primary_model: string;
  fallback_model?: string;
  local_model?: string;
  temperature: number;
  max_tokens: number;
  system_prompt_template?: string;
}

export interface AIResponse {
  content: string;
  model_used: string;
  provider: string;
  processing_time_ms: number;
  token_count?: number;
  cost_usd?: number;
}

export interface AIProvider {
  name: string;
  isAvailable: () => Promise<boolean>;
  chat: (
    model: string,
    messages: AIMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ) => Promise<string>;
  listModels?: () => Promise<string[]>;
}

export class OllamaProvider implements AIProvider {
  name = 'ollama';

  async isAvailable(): Promise<boolean> {
    return await ollamaService.isAvailable();
  }

  async chat(
    model: string,
    messages: AIMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ): Promise<string> {
    const ollamaMessages: OllamaMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    return await ollamaService.chat(model, ollamaMessages, options);
  }

  async listModels(): Promise<string[]> {
    const models = await ollamaService.listModels();
    return models.map(model => model.name);
  }
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';

  async isAvailable(): Promise<boolean> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return false;
    }

    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error: any) {
      console.warn('OpenAI connectivity check failed:', error?.response?.status || error.message);
      return false;
    }
  }

  async chat(
    model: string,
    messages: AIMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    try {
      const openaiMessages = messages.map(m => ({ role: m.role, content: m.content }));

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: openaiMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 512,
          top_p: options?.top_p ?? 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000,
        }
      );

      return response.data.choices?.[0]?.message?.content?.trim() || '';
    } catch (error: any) {
      console.error('OpenAI chat failed:', error?.response?.data || error.message);
      throw new Error('Failed to get chat response from OpenAI');
    }
  }
}

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';

  async isAvailable(): Promise<boolean> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return false;
    }

    try {
      const response = await axios.get('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error: any) {
      console.warn('Anthropic connectivity check failed:', error?.response?.status || error.message);
      return false;
    }
  }

  async chat(
    model: string,
    messages: AIMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ): Promise<string> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set');
    }

    try {
      const anthropicMessages = messages.map(m => ({ role: m.role, content: m.content }));

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: options?.max_tokens ?? 512,
          temperature: options?.temperature ?? 0.7,
          messages: anthropicMessages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000,
        }
      );

      return response.data?.content?.[0]?.text?.trim() || '';
    } catch (error: any) {
      console.error('Anthropic chat failed:', error?.response?.data || error.message);
      throw new Error('Failed to get chat response from Anthropic');
    }
  }
}

export class AIProviderService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider = 'ollama';

  constructor() {
    // Register available providers
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
  }

  /**
   * Get list of available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    
    return available;
  }

  /**
   * Get the best available provider for a given model configuration
   */
  async getBestProvider(modelConfig: AIModelConfig): Promise<string> {
    const available = await this.getAvailableProviders();
    
    // Priority order: local (Ollama) -> external APIs
    const preferenceOrder = ['ollama', 'openai', 'anthropic'];
    
    for (const provider of preferenceOrder) {
      if (available.includes(provider)) {
        return provider;
      }
    }
    
    throw new Error('No AI providers available');
  }

  /**
   * Select the best model for a given configuration and available providers
   */
  async selectModel(modelConfig: AIModelConfig): Promise<{ model: string; provider: string }> {
    const availableProviders = await this.getAvailableProviders();
    
    // Try local model first if Ollama is available
    if (availableProviders.includes('ollama') && modelConfig.local_model) {
      const ollamaProvider = this.providers.get('ollama')!;
      await ollamaService.ensureModel(modelConfig.local_model);
      return {
        model: modelConfig.local_model,
        provider: 'ollama'
      };
    }
    
    // Fallback to primary model with best available provider
    const provider = await this.getBestProvider(modelConfig);
    const model = modelConfig.primary_model;
    
    return { model, provider };
  }

  /**
   * Generate AI response using the best available provider and model
   */
  async generateResponse(
    modelConfig: AIModelConfig,
    messages: AIMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Add system prompt if provided
      let allMessages = [...messages];
      if (systemPrompt) {
        allMessages = [
          { role: 'system', content: systemPrompt },
          ...messages
        ];
      }
      
      // Select best model and provider
      const { model, provider } = await this.selectModel(modelConfig);
      const aiProvider = this.providers.get(provider)!;
      
      // Generate response
      const content = await aiProvider.chat(model, allMessages, {
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.max_tokens,
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        content,
        model_used: model,
        provider,
        processing_time_ms: processingTime,
        token_count: this.estimateTokenCount(content),
        cost_usd: this.estimateCost(provider, model, content),
      };
      
    } catch (error: any) {
      console.error('AI generation failed:', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Simple token count estimation (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for most models
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost based on provider and usage
   */
  private estimateCost(provider: string, model: string, content: string): number {
    // Local models (Ollama) are free
    if (provider === 'ollama') {
      return 0;
    }
    
    // TODO: Implement actual cost calculation for external APIs
    // This would depend on the specific pricing of each provider
    const tokenCount = this.estimateTokenCount(content);
    
    // Placeholder cost calculation
    switch (provider) {
      case 'openai':
        return tokenCount * 0.000002; // $0.002 per 1K tokens (rough estimate)
      case 'anthropic':
        return tokenCount * 0.000008; // $0.008 per 1K tokens (rough estimate)
      default:
        return 0;
    }
  }

  /**
   * Test all available providers
   */
  async testProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.isAvailable();
      } catch (error) {
        console.error(`Provider ${name} test failed:`, error);
        results[name] = false;
      }
    }
    
    return results;
  }

  /**
   * Get provider instance
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }
}

// Singleton instance
export const aiProviderService = new AIProviderService();
