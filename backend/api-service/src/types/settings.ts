// ZAEUS Application Settings Types

export interface AgentConfig {
  name: string
  description: string
  friendly_model: string
  expert_model: string
  enabled: boolean
  icon?: string
}

export interface AppSettings {
  app_name: string
  app_version: string
  maintenance_mode: boolean
  allow_registration: boolean
  require_email_verification: boolean
  session_timeout: number
  max_login_attempts: number
  ai_models: AIModelSettings
  features: FeatureSettings
  limits: LimitSettings
  agents?: { [key: string]: AgentConfig }
  updated_at?: Date
  updated_by?: string
}

export interface AIModelSettings {
  default_model: 'ollama' | 'openai' | 'claude'
  ollama_enabled: boolean
  openai_enabled: boolean
  claude_enabled: boolean
  ollama_config?: {
    base_url: string
    models: string[]
  }
  openai_config?: {
    api_key_encrypted?: string
    organization?: string
    model?: string
  }
  claude_config?: {
    api_key_encrypted?: string
    model?: string
  }
}

export interface FeatureSettings {
  chat_enabled: boolean
  analytics_enabled: boolean
  export_enabled: boolean
  community_enabled: boolean
  advanced_trading_enabled?: boolean
  backtesting_enabled?: boolean
}

export interface LimitSettings {
  max_conversations_per_user: number
  max_messages_per_conversation: number
  max_file_size_mb: number
  rate_limit_requests_per_minute?: number
  max_ai_requests_per_day?: number
}

export interface UpdateSettingsRequest {
  app_name?: string
  maintenance_mode?: boolean
  allow_registration?: boolean
  require_email_verification?: boolean
  session_timeout?: number
  max_login_attempts?: number
  ai_models?: Partial<AIModelSettings>
  features?: Partial<FeatureSettings>
  limits?: Partial<LimitSettings>
  agents?: { [key: string]: AgentConfig }
}