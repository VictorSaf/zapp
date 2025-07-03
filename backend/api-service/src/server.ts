import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DatabaseConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import config from './config';

// Create Express application
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/health', healthRoutes);

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ZAEUS API Service is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    console.log('🚀 Starting ZAEUS API Service...');
    
    // Test database connection
    const dbConnection = DatabaseConnection.getInstance(config.database);
    const dbConnected = await dbConnection.testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed. Exiting...');
      process.exit(1);
    }

    // Start the server
    const server = app.listen(config.port, config.host, () => {
      console.log(`✅ ZAEUS API Service is running on http://${config.host}:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
      console.log(`🔗 Health check: http://${config.host}:${config.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📴 SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await dbConnection.close();
        console.log('👋 Server closed. Goodbye!');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('📴 SIGINT received. Shutting down gracefully...');
      server.close(async () => {
        await dbConnection.close();
        console.log('👋 Server closed. Goodbye!');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();