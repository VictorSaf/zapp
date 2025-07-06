// Basic test to verify Docker and service structure
const express = require('express');
const app = express();

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ZAEUS AI Orchestrator',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    service: 'ZAEUS AI Orchestrator',
    version: '1.0.0',
    description: 'Multi-agent AI orchestration and coordination service',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'AI Orchestrator is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Orchestrator test server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});