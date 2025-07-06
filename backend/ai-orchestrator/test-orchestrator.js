// Test script for Agent Orchestrator functionality
const express = require('express');
const app = express();

// Mock agent registry
const mockAgents = [
  {
    id: 'agent-001',
    name: 'Trading Mentor AI',
    type: 'trading_mentor',
    capabilities: ['education', 'mentoring', 'natural_language'],
    status: 'active',
    performance: {
      totalTasks: 100,
      completedTasks: 95,
      failedTasks: 5,
      averageResponseTimeMs: 2500,
      successRate: 0.95,
      currentLoad: 0.3
    },
    configuration: {
      maxConcurrentTasks: 10,
      endpoints: {
        primary: 'http://localhost:3002',
        health: 'http://localhost:3002/health'
      }
    }
  },
  {
    id: 'agent-002',
    name: 'Market Analyst AI',
    type: 'market_analyst',
    capabilities: ['market_prediction', 'data_analysis', 'technical_analysis'],
    status: 'active',
    performance: {
      totalTasks: 75,
      completedTasks: 70,
      failedTasks: 5,
      averageResponseTimeMs: 3200,
      successRate: 0.93,
      currentLoad: 0.6
    },
    configuration: {
      maxConcurrentTasks: 8,
      endpoints: {
        primary: 'http://localhost:3003',
        health: 'http://localhost:3003/health'
      }
    }
  },
  {
    id: 'agent-003',
    name: 'Risk Manager AI',
    type: 'risk_manager',
    capabilities: ['risk_assessment', 'portfolio_optimization', 'data_analysis'],
    status: 'idle',
    performance: {
      totalTasks: 50,
      completedTasks: 48,
      failedTasks: 2,
      averageResponseTimeMs: 1800,
      successRate: 0.96,
      currentLoad: 0.1
    },
    configuration: {
      maxConcurrentTasks: 5,
      endpoints: {
        primary: 'http://localhost:3004',
        health: 'http://localhost:3004/health'
      }
    }
  }
];

// Mock tasks
const mockTasks = [];
let taskCounter = 1;

app.use(express.json());

// Test endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Agent Orchestrator Test',
    timestamp: new Date().toISOString(),
    components: {
      agentRegistry: 'operational',
      taskDistribution: 'operational',
      loadBalancer: 'operational',
      communication: 'operational'
    }
  });
});

// Agent Registry endpoints
app.get('/api/agents', (req, res) => {
  const { type, capability, status } = req.query;
  
  let filteredAgents = [...mockAgents];
  
  if (type) {
    filteredAgents = filteredAgents.filter(agent => agent.type === type);
  }
  
  if (capability) {
    filteredAgents = filteredAgents.filter(agent => 
      agent.capabilities.includes(capability)
    );
  }
  
  if (status) {
    filteredAgents = filteredAgents.filter(agent => agent.status === status);
  }
  
  res.json({
    success: true,
    data: {
      agents: filteredAgents,
      totalCount: filteredAgents.length,
      stats: {
        totalAgents: mockAgents.length,
        activeAgents: mockAgents.filter(a => a.status === 'active').length,
        idleAgents: mockAgents.filter(a => a.status === 'idle').length,
        averageLoad: mockAgents.reduce((sum, a) => sum + a.performance.currentLoad, 0) / mockAgents.length
      }
    }
  });
});

app.get('/api/agents/:agentId', (req, res) => {
  const agent = mockAgents.find(a => a.id === req.params.agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' }
    });
  }
  
  res.json({
    success: true,
    data: agent
  });
});

// Task Distribution endpoints
app.post('/api/orchestration/tasks', (req, res) => {
  const {
    type = 'education_query',
    input,
    priority = 'medium',
    requirements = {}
  } = req.body;

  // Simple agent selection logic
  let suitableAgents = mockAgents.filter(agent => agent.status === 'active' || agent.status === 'idle');
  
  // Filter by capability requirements
  if (requirements.requiredCapabilities) {
    suitableAgents = suitableAgents.filter(agent =>
      requirements.requiredCapabilities.every(cap => agent.capabilities.includes(cap))
    );
  }
  
  if (suitableAgents.length === 0) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'NO_SUITABLE_AGENTS',
        message: 'No suitable agents available for this task'
      }
    });
  }
  
  // Select agent with lowest load
  const selectedAgent = suitableAgents.reduce((best, current) => 
    current.performance.currentLoad < best.performance.currentLoad ? current : best
  );
  
  // Create task
  const task = {
    id: `task-${taskCounter++}`,
    type,
    input,
    priority,
    requirements,
    assignedAgentId: selectedAgent.id,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    estimatedCompletionTime: Math.round(selectedAgent.performance.averageResponseTimeMs * (1 + selectedAgent.performance.currentLoad))
  };
  
  mockTasks.push(task);
  
  // Update agent load
  selectedAgent.performance.currentLoad = Math.min(1.0, selectedAgent.performance.currentLoad + 0.1);
  
  res.json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      estimatedCompletionTime: task.estimatedCompletionTime,
      assignedAgentId: selectedAgent.id,
      agentName: selectedAgent.name,
      queuePosition: 0,
      message: `Task assigned to ${selectedAgent.name} (${selectedAgent.type})`
    }
  });
});

app.get('/api/orchestration/tasks/:taskId/status', (req, res) => {
  const task = mockTasks.find(t => t.id === req.params.taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
    });
  }
  
  // Simulate task progression
  const now = new Date();
  const createdAt = new Date(task.createdAt);
  const elapsed = now.getTime() - createdAt.getTime();
  
  if (elapsed > task.estimatedCompletionTime && task.status !== 'completed') {
    task.status = 'completed';
    task.completedAt = now.toISOString();
    task.result = {
      success: true,
      data: {
        message: 'Mock task completed successfully',
        analysis: 'This is a simulated response from the AI agent',
        confidence: 0.95
      },
      processingTimeMs: elapsed
    };
    
    // Reduce agent load
    const agent = mockAgents.find(a => a.id === task.assignedAgentId);
    if (agent) {
      agent.performance.currentLoad = Math.max(0, agent.performance.currentLoad - 0.1);
    }
  }
  
  res.json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      assignedAgentId: task.assignedAgentId,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      result: task.result,
      progress: Math.min(100, Math.round((elapsed / task.estimatedCompletionTime) * 100))
    }
  });
});

// Agent switching endpoint
app.post('/api/agents/switch', (req, res) => {
  const {
    currentTaskId,
    targetAgentType,
    reason = 'User requested switch',
    preserveContext = true
  } = req.body;
  
  const currentTask = mockTasks.find(t => t.id === currentTaskId);
  if (!currentTask) {
    return res.status(404).json({
      success: false,
      error: { code: 'TASK_NOT_FOUND', message: 'Current task not found' }
    });
  }
  
  // Find new agent
  let newCandidates = mockAgents.filter(agent => 
    agent.id !== currentTask.assignedAgentId && 
    (agent.status === 'active' || agent.status === 'idle')
  );
  
  if (targetAgentType) {
    newCandidates = newCandidates.filter(agent => agent.type === targetAgentType);
  }
  
  if (newCandidates.length === 0) {
    return res.status(503).json({
      success: false,
      message: 'No suitable alternative agents available'
    });
  }
  
  const newAgent = newCandidates.reduce((best, current) => 
    current.performance.currentLoad < best.performance.currentLoad ? current : best
  );
  
  // Create new task
  const newTask = {
    id: `task-${taskCounter++}`,
    type: currentTask.type,
    input: preserveContext ? {
      ...currentTask.input,
      context: {
        ...currentTask.input.context,
        previousTaskId: currentTask.id,
        switchReason: reason
      }
    } : currentTask.input,
    priority: currentTask.priority,
    requirements: currentTask.requirements,
    assignedAgentId: newAgent.id,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    estimatedCompletionTime: Math.round(newAgent.performance.averageResponseTimeMs * (1 + newAgent.performance.currentLoad))
  };
  
  // Cancel old task
  currentTask.status = 'cancelled';
  currentTask.cancelReason = reason;
  
  // Update agent loads
  const oldAgent = mockAgents.find(a => a.id === currentTask.assignedAgentId);
  if (oldAgent) {
    oldAgent.performance.currentLoad = Math.max(0, oldAgent.performance.currentLoad - 0.1);
  }
  newAgent.performance.currentLoad = Math.min(1.0, newAgent.performance.currentLoad + 0.1);
  
  mockTasks.push(newTask);
  
  res.json({
    success: true,
    data: {
      newTaskId: newTask.id,
      newAgentId: newAgent.id,
      newAgentName: newAgent.name,
      message: `Successfully switched to ${newAgent.name} (${newAgent.type})`,
      preservedContext: preserveContext
    }
  });
});

// Load balancing stats
app.get('/api/load-balancing/stats', (req, res) => {
  const loadDistribution = {};
  let totalLoad = 0;
  
  mockAgents.forEach(agent => {
    const load = agent.performance.currentLoad;
    loadDistribution[agent.id] = {
      agentName: agent.name,
      agentType: agent.type,
      load: load,
      loadPercentage: Math.round(load * 100)
    };
    totalLoad += load;
  });
  
  const averageLoad = totalLoad / mockAgents.length;
  const overloadedAgents = mockAgents.filter(a => a.performance.currentLoad > 0.8).length;
  const idleAgents = mockAgents.filter(a => a.performance.currentLoad === 0).length;
  
  res.json({
    success: true,
    data: {
      totalAgents: mockAgents.length,
      averageLoad: Math.round(averageLoad * 100) / 100,
      overloadedAgents,
      idleAgents,
      loadDistribution,
      timestamp: new Date().toISOString()
    }
  });
});

// Task statistics
app.get('/api/tasks/stats', (req, res) => {
  const statsByStatus = mockTasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});
  
  const statsByType = mockTasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {});
  
  const completedTasks = mockTasks.filter(t => t.status === 'completed');
  const averageProcessingTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, task) => sum + (task.result?.processingTimeMs || 0), 0) / completedTasks.length
    : 0;
  
  res.json({
    success: true,
    data: {
      totalTasks: mockTasks.length,
      statsByStatus,
      statsByType,
      averageProcessingTimeMs: Math.round(averageProcessingTime),
      recentTasks: mockTasks.slice(-5).map(task => ({
        id: task.id,
        type: task.type,
        status: task.status,
        assignedAgent: mockAgents.find(a => a.id === task.assignedAgentId)?.name
      })),
      timestamp: new Date().toISOString()
    }
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    service: 'Agent Orchestrator Test Service',
    version: '1.0.0',
    description: 'Test endpoints for Agent Orchestrator functionality',
    endpoints: {
      health: 'GET /health - Service health check',
      agents: 'GET /api/agents - List all agents with optional filters',
      agentById: 'GET /api/agents/:agentId - Get specific agent details',
      createTask: 'POST /api/orchestration/tasks - Create and assign new task',
      taskStatus: 'GET /api/orchestration/tasks/:taskId/status - Get task status',
      switchAgent: 'POST /api/agents/switch - Switch agent for a task',
      loadBalancingStats: 'GET /api/load-balancing/stats - Load balancing statistics',
      taskStats: 'GET /api/tasks/stats - Task distribution statistics'
    },
    examples: {
      createTask: {
        method: 'POST',
        url: '/api/orchestration/tasks',
        body: {
          type: 'education_query',
          input: {
            query: 'What are the basics of technical analysis?',
            userPreferences: { language: 'en', experienceLevel: 'beginner' }
          },
          priority: 'medium',
          requirements: {
            requiredCapabilities: ['education', 'natural_language']
          }
        }
      },
      switchAgent: {
        method: 'POST',
        url: '/api/agents/switch',
        body: {
          currentTaskId: 'task-1',
          targetAgentType: 'market_analyst',
          reason: 'Need more detailed market analysis',
          preserveContext: true
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧠 Agent Orchestrator Test Service running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 Agents: http://localhost:${PORT}/api/agents`);
  console.log(`📈 Load Stats: http://localhost:${PORT}/api/load-balancing/stats`);
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