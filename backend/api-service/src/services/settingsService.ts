import { Pool } from 'pg';
import { DatabaseConnection } from '../config/database';
import config from '../config';
import { AppSettings, UpdateSettingsRequest } from '../types/settings';
import { createError } from '../middleware/errorHandler';

export class SettingsService {
  private pool: Pool;
  private defaultSettings: AppSettings = {
    app_name: 'ZAEUS',
    app_version: '1.0.0',
    maintenance_mode: false,
    allow_registration: true,
    require_email_verification: true,
    session_timeout: 7200,
    max_login_attempts: 5,
    ai_models: {
      default_model: 'ollama',
      ollama_enabled: true,
      openai_enabled: false,
      claude_enabled: false,
      ollama_config: {
        base_url: 'http://localhost:11434',
        models: ['llama2', 'mistral', 'codellama']
      }
    },
    features: {
      chat_enabled: true,
      analytics_enabled: true,
      export_enabled: true,
      community_enabled: false,
      advanced_trading_enabled: false,
      backtesting_enabled: false
    },
    limits: {
      max_conversations_per_user: 100,
      max_messages_per_conversation: 1000,
      max_file_size_mb: 10,
      rate_limit_requests_per_minute: 60,
      max_ai_requests_per_day: 1000
    },
    agents: {
      '00z': {
        name: '00Z - Personal Trading Assistant',
        description: 'Conversații generale despre trading, răspunsuri personalizate bazate pe profil, ton prietenos și încurajator',
        friendly_model: 'llama2',
        expert_model: 'gpt-4',
        enabled: true,
        icon: '🤖'
      },
      'mentor': {
        name: 'Mentor Agent',
        description: 'Educație structurată, curriculum personalizat, quiz-uri și evaluări',
        friendly_model: 'mistral',
        expert_model: 'claude-3',
        enabled: true,
        icon: '👨‍🏫'
      },
      'analyst': {
        name: 'Analyst Agent',
        description: 'Analiză tehnică și fundamentală, interpretare grafice, screening acțiuni',
        friendly_model: 'llama2',
        expert_model: 'gpt-4',
        enabled: true,
        icon: '📊'
      },
      'reporter': {
        name: 'Reporter Agent',
        description: 'Știri relevante, sumarizare evenimente piață, alerte personalizate',
        friendly_model: 'mistral',
        expert_model: 'claude-3',
        enabled: true,
        icon: '📰'
      },
      'strategist': {
        name: 'Strategist Agent',
        description: 'Dezvoltare strategii, backtesting, risk management',
        friendly_model: 'codellama',
        expert_model: 'gpt-4',
        enabled: true,
        icon: '♟️'
      }
    }
  };

  constructor() {
    const dbConnection = DatabaseConnection.getInstance(config.database);
    this.pool = dbConnection.getPool();
    this.initializeSettings();
  }

  // Initialize settings table if it doesn't exist
  private async initializeSettings(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS zaeus_core.app_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          settings JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by UUID,
          CONSTRAINT single_row CHECK (id = 1)
        )
      `);

      // Insert default settings if not exists
      await this.pool.query(`
        INSERT INTO zaeus_core.app_settings (id, settings)
        VALUES (1, $1)
        ON CONFLICT (id) DO NOTHING
      `, [JSON.stringify(this.defaultSettings)]);
    } catch (error) {
      console.error('Failed to initialize settings table:', error);
    }
  }

  // Get current settings
  async getSettings(): Promise<AppSettings> {
    const result = await this.pool.query(
      'SELECT settings, updated_at, updated_by FROM zaeus_core.app_settings WHERE id = 1'
    );

    if (result.rows.length === 0) {
      return this.defaultSettings;
    }

    const row = result.rows[0];
    return {
      ...row.settings,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  }

  // Update settings (admin only)
  async updateSettings(updates: UpdateSettingsRequest, userId: string): Promise<AppSettings> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current settings
      const currentResult = await client.query(
        'SELECT settings FROM zaeus_core.app_settings WHERE id = 1'
      );
      
      const currentSettings = currentResult.rows.length > 0 
        ? currentResult.rows[0].settings 
        : this.defaultSettings;

      // Deep merge updates with current settings
      const updatedSettings = this.deepMerge(currentSettings, updates);

      // Update settings or insert if not exists
      await client.query(`
        INSERT INTO zaeus_core.app_settings (id, settings, updated_at, updated_by)
        VALUES (1, $1, CURRENT_TIMESTAMP, $2)
        ON CONFLICT (id) DO UPDATE
        SET 
          settings = EXCLUDED.settings,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `, [JSON.stringify(updatedSettings), userId]);

      await client.query('COMMIT');

      return this.getSettings();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Check if registration is allowed
  async isRegistrationAllowed(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.allow_registration && !settings.maintenance_mode;
  }

  // Check if in maintenance mode
  async isMaintenanceMode(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.maintenance_mode;
  }

  // Get AI model configuration
  async getAIModelConfig(): Promise<AppSettings['ai_models']> {
    const settings = await this.getSettings();
    return settings.ai_models;
  }

  // Get feature flags
  async getFeatureFlags(): Promise<AppSettings['features']> {
    const settings = await this.getSettings();
    return settings.features;
  }

  // Get limits
  async getLimits(): Promise<AppSettings['limits']> {
    const settings = await this.getSettings();
    return settings.limits;
  }

  // Deep merge helper
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}