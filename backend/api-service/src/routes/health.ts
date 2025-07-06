import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '../config/database';
import { ApiResponse } from '../types';
import { socketService } from '../services/socket.service.js';
import config from '../config';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbConnection = DatabaseConnection.getInstance(config.database);
    const dbHealthy = await dbConnection.testConnection();
    
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ZAEUS API Service',
      version: '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      },
      database: {
        connected: dbHealthy,
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
      },
      websocket: {
        connected: socketService.getIo() !== null,
        connectedUsers: socketService.getStats().connectedUsers,
        activeConversations: socketService.getStats().activeConversations,
        totalConnections: socketService.getStats().totalConnections,
      },
    };

    const response: ApiResponse = {
      success: true,
      data: health,
      message: 'Service is healthy',
    };

    const statusCode = dbHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      data: {
        timestamp: new Date().toISOString(),
        service: 'ZAEUS API Service',
        status: 'ERROR',
      },
    };

    res.status(503).json(response);
  }
});

/**
 * Detailed health check
 * GET /health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const dbConnection = DatabaseConnection.getInstance(config.database);
    const dbHealthy = await dbConnection.testConnection();
    
    // Test database query
    let dbQueryTime = 0;
    const startTime = Date.now();
    
    try {
      const pool = dbConnection.getPool();
      await pool.query('SELECT 1');
      dbQueryTime = Date.now() - startTime;
    } catch (error) {
      console.error('Database query test failed:', error);
    }

    const detailedHealth = {
      status: dbHealthy ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      service: 'ZAEUS API Service',
      version: '1.0.0',
      environment: config.nodeEnv,
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: new Date(process.uptime() * 1000).toISOString().substr(11, 8),
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100,
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100,
      },
      database: {
        connected: dbHealthy,
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        queryTime: `${dbQueryTime}ms`,
      },
      websocket: {
        initialized: socketService.getIo() !== null,
        connectedUsers: socketService.getStats().connectedUsers,
        activeConversations: socketService.getStats().activeConversations,
        totalConnections: socketService.getStats().totalConnections,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    const response: ApiResponse = {
      success: true,
      data: detailedHealth,
      message: dbHealthy ? 'All systems operational' : 'Database connectivity issues',
    };

    const statusCode = dbHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Detailed health check failed',
    };

    res.status(503).json(response);
  }
});

export default router;