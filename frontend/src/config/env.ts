export const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  AI_URL: import.meta.env.VITE_AI_URL || 'http://localhost:3001',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'ZAEUS',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
} as const

export type Config = typeof config