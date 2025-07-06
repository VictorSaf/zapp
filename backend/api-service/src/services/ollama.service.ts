import axios from 'axios';
import { config } from '../config/index';

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = config.ollama.baseUrl || 'http://localhost:11434';
    this.timeout = config.ollama.timeout || 60000; // 60 seconds default
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/version`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Ollama service not available:', error);
      return false;
    }
  }

  /**
   * List all available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get<OllamaListResponse>(`${this.baseUrl}/api/tags`, {
        timeout: this.timeout,
      });
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      throw new Error('Failed to connect to Ollama service');
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name === modelName || model.name.includes(modelName));
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName,
        stream: false,
      }, {
        timeout: 300000, // 5 minutes for model download
      });
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      throw new Error(`Failed to download model: ${modelName}`);
    }
  }

  /**
   * Generate text completion (legacy API)
   */
  async generate(
    model: string,
    prompt: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const requestData = {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.max_tokens || 500,
          top_p: options?.top_p || 0.9,
        },
      };

      const response = await axios.post<OllamaResponse>(
        `${this.baseUrl}/api/generate`,
        requestData,
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data.response;
    } catch (error) {
      console.error('Ollama generation failed:', error);
      throw new Error('Failed to generate response from Ollama');
    }
  }

  /**
   * Chat completion (preferred API)
   */
  async chat(
    model: string,
    messages: OllamaMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      top_k?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const requestData: OllamaChatRequest = {
        model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.max_tokens || 500,
          top_p: options?.top_p || 0.9,
          top_k: options?.top_k || 40,
        },
      };

      const response = await axios.post<OllamaChatResponse>(
        `${this.baseUrl}/api/chat`,
        requestData,
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data.message.content;
    } catch (error) {
      console.error('Ollama chat failed:', error);
      throw new Error('Failed to get chat response from Ollama');
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<OllamaModel | null> {
    try {
      const models = await this.listModels();
      return models.find(model => model.name === modelName) || null;
    } catch (error) {
      console.error(`Failed to get model info for ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Test connection with a simple prompt
   */
  async testConnection(model = 'llama3.2'): Promise<boolean> {
    try {
      const response = await this.chat(model, [
        { role: 'user', content: 'Test connection. Reply with OK.' }
      ], { max_tokens: 10 });
      
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Ensure model is available, download if necessary
   */
  async ensureModel(modelName: string): Promise<void> {
    const isAvailable = await this.isModelAvailable(modelName);
    
    if (!isAvailable) {
      console.log(`Model ${modelName} not found. Downloading...`);
      await this.pullModel(modelName);
      console.log(`Model ${modelName} downloaded successfully.`);
    }
  }

  /**
   * Get recommended models for different agent types
   */
  getRecommendedModels() {
    return {
      'agent_00z': 'llama3.2',         // General conversation
      'mentor_agent': 'llama3.2',      // Educational content
      'reporter_agent': 'llama3.2',    // News analysis
      'analyst_agent': 'llama3.2',     // Technical analysis
      'strategist_agent': 'llama3.2',  // Strategy planning
      'default': 'llama3.2'
    };
  }
}

// Singleton instance
export const ollamaService = new OllamaService();