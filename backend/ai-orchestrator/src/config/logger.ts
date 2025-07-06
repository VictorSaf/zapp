import winston from 'winston';
import config from './index';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, service, ...meta }) => {
  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    metaStr = `\n${JSON.stringify(meta, null, 2)}`;
  }
  return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: {
    service: config.serviceName,
    version: config.serviceVersion,
  },
  format: combine(
    timestamp(),
    errors({ stack: true }),
    config.nodeEnv === 'development'
      ? combine(colorize(), devFormat)
      : json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    
    // File transports for production
    ...(config.nodeEnv === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(config.nodeEnv === 'production' ? [
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    ] : []),
  ],
  
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(config.nodeEnv === 'production' ? [
      new winston.transports.File({ filename: 'logs/rejections.log' })
    ] : []),
  ],
});

// Add request ID to logger context
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// Performance logging helper
export const logPerformance = (operation: string, startTime: number, metadata?: any) => {
  const duration = Date.now() - startTime;
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata,
  });
};

// Error logging helper with context
export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
};

// Service lifecycle logging
export const logServiceEvent = (event: string, metadata?: any) => {
  logger.info('Service event', {
    event,
    ...metadata,
  });
};

export default logger;