// Test script for Memory Context Protocol functionality
const express = require('express');
const app = express();

// Mock context storage
const mockContexts = new Map();
const mockVersions = new Map();
const mockShares = new Map();
const mockMemoryProfiles = new Map();

let contextCounter = 1;
let versionCounter = 1;
let shareCounter = 1;

app.use(express.json());

// Initialize mock data
function initializeMockData() {
  // Create sample memory profiles
  const agents = ['agent-001', 'agent-002', 'agent-003'];
  
  agents.forEach(agentId => {
    mockMemoryProfiles.set(agentId, {
      agentId,
      totalMemoryMB: 512,
      usedMemoryMB: Math.floor(Math.random() * 400) + 50,
      contextCount: Math.floor(Math.random() * 50) + 10,
      fragmentationRatio: Math.random() * 0.3,
      compressionRatio: Math.random() * 0.5 + 0.3,
      lastCleanup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      memoryPressure: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    });
  });

  // Create sample contexts
  const contextTypes = ['user_session', 'conversation', 'task_execution', 'agent_memory'];
  const scopes = ['global', 'agent_specific', 'user_specific', 'session_specific'];
  
  for (let i = 1; i <= 5; i++) {
    const contextId = `ctx-${i}`;
    const context = {
      id: contextId,
      type: contextTypes[Math.floor(Math.random() * contextTypes.length)],
      scope: scopes[Math.floor(Math.random() * scopes.length)],
      data: {
        content: {
          title: `Sample Context ${i}`,
          description: `This is a sample context for testing purposes`,
          data: { value: Math.random() * 100 }
        },
        summary: `Context ${i} summary`,
        keywords: ['test', 'sample', 'context'],
        entities: [
          {
            id: `entity-${i}`,
            type: 'concept',
            name: `Concept ${i}`,
            confidence: Math.random(),
            lastMentioned: new Date()
          }
        ],
        insights: [
          {
            id: `insight-${i}`,
            type: 'pattern',
            content: `Pattern observed in context ${i}`,
            confidence: Math.random(),
            relevance: Math.random(),
            source: `agent-00${(i % 3) + 1}`,
            derivedAt: new Date()
          }
        ],
        references: []
      },
      metadata: {
        title: `Context ${i}`,
        description: `Sample context ${i}`,
        tags: ['sample', 'test'],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        sensitivity: ['public', 'internal', 'confidential'][Math.floor(Math.random() * 3)],
        quality: {
          accuracy: Math.random(),
          completeness: Math.random(),
          freshness: Math.random(),
          relevance: Math.random(),
          consistency: Math.random()
        },
        usage: {
          accessCount: Math.floor(Math.random() * 100),
          lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          sharedCount: Math.floor(Math.random() * 10),
          modificationCount: Math.floor(Math.random() * 20),
          averageRelevanceScore: Math.random()
        }
      },
      relationships: [],
      access: {
        ownerId: `agent-00${(i % 3) + 1}`,
        permissions: [],
        shareableWithAgents: [],
        shareableWithUsers: [],
        isPublic: Math.random() > 0.5,
        restrictions: []
      },
      lifecycle: {
        status: 'active',
        versionHistory: [
          {
            version: 1,
            changes: [
              {
                operation: 'create',
                path: '/',
                newValue: 'Initial creation',
                reason: 'Context created'
              }
            ],
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            createdBy: `agent-00${(i % 3) + 1}`,
            checksum: Math.random().toString(36).substr(2, 16),
            size: Math.floor(Math.random() * 10000) + 1000
          }
        ]
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      version: 1
    };
    
    mockContexts.set(contextId, context);
  }
}

// Initialize mock data
initializeMockData();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Memory Context Protocol Test',
    timestamp: new Date().toISOString(),
    components: {
      contextStorage: 'operational',
      memoryManager: 'operational',
      contextSharing: 'operational',
      versioning: 'operational'
    }
  });
});

// Context Storage endpoints
app.post('/api/context/store', (req, res) => {
  const { type, scope, data, metadata, access } = req.body;
  
  if (!type || !scope || !data) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Missing required fields' }
    });
  }
  
  const contextId = `ctx-${contextCounter++}`;
  const context = {
    id: contextId,
    type,
    scope,
    data,
    metadata: {
      title: metadata?.title || `Context ${contextId}`,
      description: metadata?.description || '',
      tags: metadata?.tags || [],
      priority: metadata?.priority || 'medium',
      sensitivity: metadata?.sensitivity || 'internal',
      quality: {
        accuracy: 0.9,
        completeness: 0.8,
        freshness: 1.0,
        relevance: 0.85,
        consistency: 0.9
      },
      usage: {
        accessCount: 0,
        sharedCount: 0,
        modificationCount: 0,
        averageRelevanceScore: 0.5
      }
    },
    relationships: [],
    access: {
      ownerId: access?.ownerId || 'system',
      permissions: access?.permissions || [],
      shareableWithAgents: access?.shareableWithAgents || [],
      shareableWithUsers: access?.shareableWithUsers || [],
      isPublic: access?.isPublic || false,
      restrictions: access?.restrictions || []
    },
    lifecycle: {
      status: 'active',
      versionHistory: [
        {
          version: 1,
          changes: [
            {
              operation: 'create',
              path: '/',
              newValue: data,
              reason: 'Initial context creation'
            }
          ],
          createdAt: new Date(),
          createdBy: access?.ownerId || 'system',
          checksum: Math.random().toString(36).substr(2, 16),
          size: JSON.stringify(data).length
        }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };
  
  mockContexts.set(contextId, context);
  
  res.json({
    success: true,
    data: {
      contextId,
      version: 1,
      size: JSON.stringify(data).length,
      message: 'Context stored successfully'
    }
  });
});

app.get('/api/context/:contextId', (req, res) => {
  const { contextId } = req.params;
  const context = mockContexts.get(contextId);
  
  if (!context) {
    return res.status(404).json({
      success: false,
      error: { code: 'CONTEXT_NOT_FOUND', message: 'Context not found' }
    });
  }
  
  // Update access count
  context.metadata.usage.accessCount++;
  context.metadata.usage.lastAccessed = new Date();
  
  res.json({
    success: true,
    data: context
  });
});

app.put('/api/context/:contextId', (req, res) => {
  const { contextId } = req.params;
  const updates = req.body;
  const context = mockContexts.get(contextId);
  
  if (!context) {
    return res.status(404).json({
      success: false,
      error: { code: 'CONTEXT_NOT_FOUND', message: 'Context not found' }
    });
  }
  
  // Create new version
  const newVersion = context.version + 1;
  const changes = [];
  
  // Update context
  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'version') {
      changes.push({
        operation: 'update',
        path: `/${key}`,
        oldValue: context[key],
        newValue: updates[key],
        reason: 'Context updated'
      });
      context[key] = updates[key];
    }
  });
  
  context.version = newVersion;
  context.updatedAt = new Date();
  context.metadata.usage.modificationCount++;
  
  // Add version to history
  context.lifecycle.versionHistory.push({
    version: newVersion,
    changes,
    createdAt: new Date(),
    createdBy: updates.updatedBy || 'system',
    checksum: Math.random().toString(36).substr(2, 16),
    size: JSON.stringify(context).length
  });
  
  res.json({
    success: true,
    data: {
      contextId,
      version: newVersion,
      changes: changes.length,
      message: 'Context updated successfully'
    }
  });
});

// Context Search
app.post('/api/context/search', (req, res) => {
  const { filters = [], sorting = [], pagination = { page: 1, limit: 10 } } = req.body;
  
  let results = Array.from(mockContexts.values());
  
  // Apply simple filtering
  for (const filter of filters) {
    if (filter.field === 'type') {
      results = results.filter(ctx => ctx.type === filter.value);
    } else if (filter.field === 'scope') {
      results = results.filter(ctx => ctx.scope === filter.value);
    } else if (filter.field === 'access.ownerId') {
      results = results.filter(ctx => ctx.access.ownerId === filter.value);
    }
  }
  
  // Apply sorting
  if (sorting.length > 0) {
    const sort = sorting[0];
    results.sort((a, b) => {
      let aVal = a[sort.field];
      let bVal = b[sort.field];
      
      if (sort.field.includes('.')) {
        const parts = sort.field.split('.');
        aVal = parts.reduce((obj, part) => obj?.[part], a);
        bVal = parts.reduce((obj, part) => obj?.[part], b);
      }
      
      if (sort.direction === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }
  
  // Apply pagination
  const total = results.length;
  const start = (pagination.page - 1) * pagination.limit;
  const paginatedResults = results.slice(start, start + pagination.limit);
  
  res.json({
    success: true,
    data: {
      contexts: paginatedResults,
      totalCount: total,
      searchTime: Math.floor(Math.random() * 100) + 10,
      page: pagination.page,
      limit: pagination.limit,
      suggestions: [
        { type: 'keyword', text: 'sample', confidence: 0.9 },
        { type: 'keyword', text: 'test', confidence: 0.8 }
      ]
    }
  });
});

// Memory Management endpoints
app.get('/api/memory/stats', (req, res) => {
  const profiles = Array.from(mockMemoryProfiles.values());
  const totalUsed = profiles.reduce((sum, p) => sum + p.usedMemoryMB, 0);
  const totalAvailable = profiles.reduce((sum, p) => sum + p.totalMemoryMB, 0);
  
  res.json({
    success: true,
    data: {
      totalMemoryMB: totalAvailable,
      usedMemoryMB: totalUsed,
      availableMemoryMB: totalAvailable - totalUsed,
      usagePercent: Math.round((totalUsed / totalAvailable) * 100),
      systemPressure: totalUsed / totalAvailable > 0.8 ? 'high' : totalUsed / totalAvailable > 0.6 ? 'medium' : 'low',
      agentCount: profiles.length,
      agentStats: profiles.map(profile => ({
        agentId: profile.agentId,
        usedMemoryMB: profile.usedMemoryMB,
        contextCount: profile.contextCount,
        memoryPressure: profile.memoryPressure,
        fragmentationRatio: Math.round(profile.fragmentationRatio * 100) / 100,
        compressionRatio: Math.round(profile.compressionRatio * 100) / 100
      })),
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/memory/optimize/:agentId', (req, res) => {
  const { agentId } = req.params;
  const { strategy = 'compression' } = req.body;
  
  const profile = mockMemoryProfiles.get(agentId);
  if (!profile) {
    return res.status(404).json({
      success: false,
      error: { code: 'AGENT_NOT_FOUND', message: 'Agent memory profile not found' }
    });
  }
  
  // Simulate optimization
  const originalUsed = profile.usedMemoryMB;
  let memoryFreed = 0;
  
  switch (strategy) {
    case 'compression':
      memoryFreed = originalUsed * 0.3; // 30% reduction
      break;
    case 'archival':
      memoryFreed = originalUsed * 0.2; // 20% reduction
      break;
    case 'deduplication':
      memoryFreed = originalUsed * 0.15; // 15% reduction
      break;
    case 'selective_deletion':
      memoryFreed = originalUsed * 0.4; // 40% reduction
      break;
    default:
      memoryFreed = originalUsed * 0.1; // 10% reduction
  }
  
  profile.usedMemoryMB = Math.max(0, originalUsed - memoryFreed);
  profile.memoryPressure = profile.usedMemoryMB / profile.totalMemoryMB > 0.8 ? 'high' : 
                           profile.usedMemoryMB / profile.totalMemoryMB > 0.6 ? 'medium' : 'low';
  profile.lastCleanup = new Date();
  
  res.json({
    success: true,
    data: {
      agentId,
      strategy,
      memoryFreedMB: Math.round(memoryFreed * 100) / 100,
      newUsedMB: Math.round(profile.usedMemoryMB * 100) / 100,
      newPressure: profile.memoryPressure,
      optimizationTime: Math.floor(Math.random() * 5000) + 1000
    }
  });
});

// Context Sharing endpoints
app.post('/api/context/share', (req, res) => {
  const { contextId, requesterId, targetId, targetType, permissions, message } = req.body;
  
  const context = mockContexts.get(contextId);
  if (!context) {
    return res.status(404).json({
      success: false,
      error: { code: 'CONTEXT_NOT_FOUND', message: 'Context not found' }
    });
  }
  
  const shareId = `share-${shareCounter++}`;
  const share = {
    shareId,
    contextId,
    requesterId,
    targetId,
    targetType,
    permissions,
    message,
    createdAt: new Date(),
    status: 'active'
  };
  
  mockShares.set(shareId, share);
  
  // Update context permissions
  context.access.permissions.push({
    principalId: targetId,
    principalType: targetType,
    permissions,
    grantedAt: new Date(),
    grantedBy: requesterId
  });
  
  context.metadata.usage.sharedCount++;
  
  res.json({
    success: true,
    data: {
      shareId,
      message: `Context shared with ${targetType} ${targetId}`,
      permissions,
      expiresAt: null
    }
  });
});

app.get('/api/context/shares/:contextId', (req, res) => {
  const { contextId } = req.params;
  
  const shares = Array.from(mockShares.values()).filter(share => share.contextId === contextId);
  
  res.json({
    success: true,
    data: {
      contextId,
      shares: shares.map(share => ({
        shareId: share.shareId,
        targetId: share.targetId,
        targetType: share.targetType,
        permissions: share.permissions,
        createdAt: share.createdAt,
        status: share.status
      })),
      totalShares: shares.length
    }
  });
});

// Context Versioning endpoints
app.get('/api/context/:contextId/versions', (req, res) => {
  const { contextId } = req.params;
  const context = mockContexts.get(contextId);
  
  if (!context) {
    return res.status(404).json({
      success: false,
      error: { code: 'CONTEXT_NOT_FOUND', message: 'Context not found' }
    });
  }
  
  res.json({
    success: true,
    data: {
      contextId,
      versions: context.lifecycle.versionHistory,
      currentVersion: context.version,
      totalVersions: context.lifecycle.versionHistory.length
    }
  });
});

app.post('/api/context/:contextId/revert', (req, res) => {
  const { contextId } = req.params;
  const { targetVersion, requesterId, reason } = req.body;
  
  const context = mockContexts.get(contextId);
  if (!context) {
    return res.status(404).json({
      success: false,
      error: { code: 'CONTEXT_NOT_FOUND', message: 'Context not found' }
    });
  }
  
  const targetVersionObj = context.lifecycle.versionHistory.find(v => v.version === targetVersion);
  if (!targetVersionObj) {
    return res.status(404).json({
      success: false,
      error: { code: 'VERSION_NOT_FOUND', message: 'Target version not found' }
    });
  }
  
  // Create new version for the revert
  const newVersion = context.version + 1;
  context.version = newVersion;
  context.updatedAt = new Date();
  
  context.lifecycle.versionHistory.push({
    version: newVersion,
    changes: [
      {
        operation: 'update',
        path: '/',
        oldValue: context,
        newValue: `Reverted to version ${targetVersion}`,
        reason: reason || `Reverted to version ${targetVersion}`
      }
    ],
    createdAt: new Date(),
    createdBy: requesterId || 'system',
    checksum: Math.random().toString(36).substr(2, 16),
    size: JSON.stringify(context).length
  });
  
  res.json({
    success: true,
    data: {
      contextId,
      targetVersion,
      newVersion,
      message: `Context reverted to version ${targetVersion}`,
      revertedAt: new Date()
    }
  });
});

app.get('/api/context/:contextId/diff/:fromVersion/:toVersion', (req, res) => {
  const { contextId, fromVersion, toVersion } = req.params;
  const context = mockContexts.get(contextId);
  
  if (!context) {
    return res.status(404).json({
      success: false,
      error: { code: 'CONTEXT_NOT_FOUND', message: 'Context not found' }
    });
  }
  
  const fromVersionObj = context.lifecycle.versionHistory.find(v => v.version === parseInt(fromVersion));
  const toVersionObj = context.lifecycle.versionHistory.find(v => v.version === parseInt(toVersion));
  
  if (!fromVersionObj || !toVersionObj) {
    return res.status(404).json({
      success: false,
      error: { code: 'VERSION_NOT_FOUND', message: 'One or more versions not found' }
    });
  }
  
  // Mock diff calculation
  const changes = toVersionObj.changes;
  const insertions = changes.filter(c => c.operation === 'create').length;
  const deletions = changes.filter(c => c.operation === 'delete').length;
  const modifications = changes.filter(c => c.operation === 'update').length;
  
  res.json({
    success: true,
    data: {
      contextId,
      fromVersion: parseInt(fromVersion),
      toVersion: parseInt(toVersion),
      changes,
      insertions,
      deletions,
      modifications,
      totalChanges: changes.length
    }
  });
});

// Statistics endpoints
app.get('/api/stats/overview', (req, res) => {
  const contexts = Array.from(mockContexts.values());
  const shares = Array.from(mockShares.values());
  const profiles = Array.from(mockMemoryProfiles.values());
  
  const totalMemory = profiles.reduce((sum, p) => sum + p.totalMemoryMB, 0);
  const usedMemory = profiles.reduce((sum, p) => sum + p.usedMemoryMB, 0);
  
  const statsByType = contexts.reduce((acc, ctx) => {
    acc[ctx.type] = (acc[ctx.type] || 0) + 1;
    return acc;
  }, {});
  
  const statsByScope = contexts.reduce((acc, ctx) => {
    acc[ctx.scope] = (acc[ctx.scope] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      contexts: {
        total: contexts.length,
        byType: statsByType,
        byScope: statsByScope,
        averageSize: contexts.reduce((sum, ctx) => sum + (ctx.lifecycle.versionHistory[0]?.size || 0), 0) / contexts.length
      },
      memory: {
        totalMB: totalMemory,
        usedMB: usedMemory,
        availableMB: totalMemory - usedMemory,
        usagePercent: Math.round((usedMemory / totalMemory) * 100),
        agentCount: profiles.length
      },
      sharing: {
        totalShares: shares.length,
        activeShares: shares.filter(s => s.status === 'active').length,
        sharedContexts: new Set(shares.map(s => s.contextId)).size
      },
      versioning: {
        totalVersions: contexts.reduce((sum, ctx) => sum + ctx.lifecycle.versionHistory.length, 0),
        averageVersionsPerContext: contexts.reduce((sum, ctx) => sum + ctx.lifecycle.versionHistory.length, 0) / contexts.length
      },
      timestamp: new Date().toISOString()
    }
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    service: 'Memory Context Protocol Test Service',
    version: '1.0.0',
    description: 'Test endpoints for Memory Context Protocol functionality',
    endpoints: {
      health: 'GET /health - Service health check',
      
      // Context Storage
      storeContext: 'POST /api/context/store - Store new context',
      getContext: 'GET /api/context/:contextId - Retrieve context by ID',
      updateContext: 'PUT /api/context/:contextId - Update existing context',
      searchContexts: 'POST /api/context/search - Search contexts with filters',
      
      // Memory Management
      memoryStats: 'GET /api/memory/stats - Memory usage statistics',
      optimizeMemory: 'POST /api/memory/optimize/:agentId - Optimize agent memory',
      
      // Context Sharing
      shareContext: 'POST /api/context/share - Share context with other agents',
      getShares: 'GET /api/context/shares/:contextId - Get context shares',
      
      // Context Versioning
      getVersions: 'GET /api/context/:contextId/versions - Get context version history',
      revertVersion: 'POST /api/context/:contextId/revert - Revert to previous version',
      getVersionDiff: 'GET /api/context/:contextId/diff/:fromVersion/:toVersion - Compare versions',
      
      // Statistics
      overview: 'GET /api/stats/overview - Overall system statistics'
    },
    examples: {
      storeContext: {
        method: 'POST',
        url: '/api/context/store',
        body: {
          type: 'conversation',
          scope: 'session_specific',
          data: {
            content: { message: 'Hello, world!' },
            keywords: ['greeting', 'conversation']
          },
          metadata: { 
            title: 'Sample Conversation',
            priority: 'medium',
            tags: ['test']
          },
          access: { ownerId: 'agent-001' }
        }
      },
      shareContext: {
        method: 'POST',
        url: '/api/context/share',
        body: {
          contextId: 'ctx-1',
          requesterId: 'agent-001',
          targetId: 'agent-002',
          targetType: 'agent',
          permissions: ['read', 'write']
        }
      },
      optimizeMemory: {
        method: 'POST',
        url: '/api/memory/optimize/agent-001',
        body: { strategy: 'compression' }
      }
    }
  });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧠 Memory Context Protocol Test Service running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`💾 Memory Stats: http://localhost:${PORT}/api/memory/stats`);
  console.log(`🔄 Context Search: http://localhost:${PORT}/api/context/search`);
  console.log(`📈 Overview: http://localhost:${PORT}/api/stats/overview`);
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