import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DatabaseConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai.routes';
import agentsRoutes from './routes/agents.routes';
import settingsRoutes from './routes/settings';
import conversationsRoutes from './routes/conversations-simple';
// import tradingRoutes from './routes/trading.routes';
// import marketDataRoutes from './routes/market-data.routes';
// import strategyRoutes from './routes/strategy.routes';
// import portfolioRoutes from './routes/portfolio.routes';
import { socketService } from './services/socket.service';
import { createServer } from 'http';
import config from './config';

// Create Express application
const app = express();

// Initialize Socket.io
socketService.initialize(app);

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
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and LAN access
    if (origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('192.168.') || 
        origin.includes('10.0.') ||
        origin.includes('172.16.') ||
        config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
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
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/conversations', conversationsRoutes);
// app.use('/api/trading', tradingRoutes);
// app.use('/api/market-data', marketDataRoutes);
// app.use('/api/strategies', strategyRoutes);
// app.use('/api/portfolio', portfolioRoutes);

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

    // Start the server with Socket.io
    const httpServer = socketService.getHttpServer();
    const server = httpServer.listen(config.port, config.host, () => {
      console.log(`✅ ZAEUS API Service is running on http://${config.host}:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
      console.log(`🔗 Health check: http://${config.host}:${config.port}/health`);
      console.log(`🔌 Socket.io server ready for WebSocket connections`);
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