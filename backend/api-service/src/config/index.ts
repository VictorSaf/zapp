import dotenv from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables
dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env.API_PORT || '3000', 10),
  host: process.env.API_HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'zaeus_db',
    user: process.env.POSTGRES_USER || 'zaeus_user',
    password: process.env.POSTGRES_PASSWORD || 'zaeus_password',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-never-use-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
}

export default config;