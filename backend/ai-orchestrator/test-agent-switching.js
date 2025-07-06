// Comprehensive test script for Agent Switching Logic functionality
const express = require('express');
const app = express();

// Mock services to simulate the TypeScript implementations
class MockContextPreservation {
  preservedContexts = new Map();
  snapshots = new Map();

  async createContextSnapshot(agentId, sessionId, conversationId, reason) {
    const snapshot = {
      agentId,
      sessionId,
      conversationId,
      reason,
      timestamp: new Date(),
      conversationHistory: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: 'Hello, I need help with trading strategies',
          timestamp: new Date(),
          importance: 0.8,
          messageType: 'query'
        },
        {
          id: `msg-${Date.now() + 1}`,
          role: 'agent',
          content: 'I can help you with trading strategies. What specific area interests you?',
          timestamp: new Date(),
          importance: 0.7,
          messageType: 'response'
        }
      ],
      userState: {
        satisfactionLevel: 0.8,
        engagementLevel: 0.9,
        frustrationIndicators: [],
        communicationStyle: 'technical',
        expertiseLevel: 'intermediate',
        preferences: {
          messageLength: 150,
          responseStyle: 'detailed'
        }
      },
      taskState: {
        stage: 'analysis',
        completionPercentage: 35,
        completedSteps: ['initial_consultation', 'risk_assessment'],
        remainingSteps: ['strategy_recommendation', 'implementation_plan']
      },
      systemState: {
        activeContexts: [`ctx-${sessionId}`],
        runningTasks: [`task-${sessionId}`],
        currentCapabilities: ['technical_analysis', 'risk_assessment'],
        resourceUsage: {
          memoryUsage: 0.4,
          cpuUsage: 0.3,
          networkUsage: 0.2,
          storageUsage: 0.35
        }
      },
      qualityScore: 0.85
    };

    this.snapshots.set(`${sessionId}-${agentId}`, snapshot);
    return snapshot;
  }

  async preserveContextForHandoff(currentAgentId, sessionId, config) {
    const preservedContextId = `preserved-${Date.now()}`;
    const originalSize = 1024 * 50; // 50KB
    const compressedSize = originalSize * (config.contextCompressionLevel === 'aggressive' ? 0.3 : 0.7);

    const result = {
      success: true,
      preservedContextId,
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      preservationLevel: config.preserveFullContext ? 'full' : 'selective',
      itemsPreserved: 45,
      itemsFiltered: 12,
      processingTime: Math.floor(Math.random() * 2000) + 500
    };

    this.preservedContexts.set(preservedContextId, {
      sessionId,
      currentAgentId,
      config,
      preservedAt: new Date()
    });

    return result;
  }

  async generateHandoffSummary(preservedContextId, targetAgentId, config) {
    const preserved = this.preservedContexts.get(preservedContextId);
    if (!preserved) {
      throw new Error('Preserved context not found');
    }

    return {
      contextTransferred: true,
      contextSize: 35840,
      preservationLevel: config.preserveFullContext ? 'full' : 'selective',
      keyInformation: [
        {
          type: 'user_intent',
          content: 'User wants to learn about advanced trading strategies',
          priority: 0.9,
          timestamp: new Date(),
          source: 'conversation_analysis'
        },
        {
          type: 'task_state',
          content: 'Currently in strategy analysis phase, 35% complete',
          priority: 0.8,
          timestamp: new Date(),
          source: 'task_manager'
        }
      ],
      conversationSummary: 'User discussing trading strategies with technical focus. Intermediate level expertise detected.',
      taskProgress: {
        stage: 'analysis',
        completionPercentage: 35,
        completedSteps: ['initial_consultation', 'risk_assessment'],
        remainingSteps: ['strategy_recommendation', 'implementation_plan']
      },
      userState: {
        satisfactionLevel: 0.8,
        communicationStyle: 'technical',
        expertiseLevel: 'intermediate'
      },
      recommendations: [
        'User prefers technical communication - use advanced terminology',
        'Task is 35% complete - focus on strategy recommendations',
        'User shows high engagement - provide detailed explanations'
      ]
    };
  }

  async restoreContextForAgent(preservedContextId, newAgentId, sessionId) {
    const preserved = this.preservedContexts.get(preservedContextId);
    return !!preserved;
  }
}

class MockSmartAgentSelection {
  agents = [
    {
      agentId: 'agent-tech-001',
      agentName: 'Technical Analysis Expert',
      agentType: 'technical_analyst',
      capabilities: ['technical_analysis', 'chart_patterns', 'indicators'],
      selectionScore: 0.92,
      selectionReasoning: ['High technical analysis capability', 'Excellent chart pattern recognition'],
      estimatedHandoffTime: 2500,
      confidenceLevel: 0.89,
      specializations: ['Technical Analysis', 'Chart Patterns'],
      currentLoad: 0.3,
      avgResponseTime: 1200,
      successRate: 0.94
    },
    {
      agentId: 'agent-risk-002',
      agentName: 'Risk Management Specialist',
      agentType: 'risk_manager',
      capabilities: ['risk_assessment', 'portfolio_management', 'compliance'],
      selectionScore: 0.87,
      selectionReasoning: ['Strong risk assessment skills', 'Portfolio optimization expertise'],
      estimatedHandoffTime: 3200,
      confidenceLevel: 0.85,
      specializations: ['Risk Management', 'Portfolio Optimization'],
      currentLoad: 0.45,
      avgResponseTime: 1800,
      successRate: 0.91
    }
  ];

  async selectBestAgent(request) {
    const selectedAgent = this.agents[0]; // Select first agent for demo

    return {
      recommendationId: `rec-${Date.now()}`,
      confidence: selectedAgent.confidenceLevel,
      reasoning: [
        `Agent selected with score ${selectedAgent.selectionScore}`,
        ...selectedAgent.selectionReasoning,
        `Estimated handoff time: ${selectedAgent.estimatedHandoffTime}ms`
      ],
      suggestedAgent: selectedAgent,
      expectedBenefits: [
        {
          type: 'improved_performance',
          description: `High success rate of ${Math.round(selectedAgent.successRate * 100)}%`,
          quantifiedValue: selectedAgent.successRate,
          probability: 0.85
        },
        {
          type: 'faster_response',
          description: `Fast average response time of ${selectedAgent.avgResponseTime}ms`,
          quantifiedValue: selectedAgent.avgResponseTime,
          probability: 0.9
        }
      ],
      potentialRisks: [
        {
          type: 'context_loss',
          description: 'Minimal context loss risk due to high preservation settings',
          severity: 'low',
          probability: 0.1,
          mitigation: 'Comprehensive context preservation enabled'
        }
      ],
      alternativeOptions: this.agents.slice(1),
      estimatedImpact: {
        userSatisfactionChange: 0.15,
        performanceChange: 0.08,
        costChange: 0,
        timeToCompletion: selectedAgent.estimatedHandoffTime,
        confidenceInterval: [0.75, 0.95]
      }
    };
  }

  async getSelectionRecommendations(criteria, sessionId, limit = 3) {
    return this.agents.slice(0, limit);
  }

  async learnFromSwitchOutcome(requestId, selectedAgentId, outcome) {
    console.log(`Learning from switch outcome: ${requestId} -> ${selectedAgentId} (success: ${outcome.success})`);
  }

  getSelectionAnalytics() {
    return {
      totalSelections: 150,
      recentSelections: 25,
      averageConfidence: 0.87,
      topSelectedAgents: [
        { agentId: 'agent-tech-001', count: 45 },
        { agentId: 'agent-risk-002', count: 32 }
      ],
      algorithmPerformance: [
        { name: 'performance', weight: 25, description: 'Evaluates historical performance' },
        { name: 'capability_match', weight: 30, description: 'Matches capabilities to requirements' }
      ],
      timestamp: new Date().toISOString()
    };
  }
}

class MockSeamlessHandoff {
  activeHandoffs = new Map();
  handoffHistory = [];

  async initiateHandoff(request) {
    const startTime = Date.now();
    const handoffId = `handoff-${Date.now()}`;

    // Create progress tracking
    const progress = {
      switchRequestId: request.id,
      currentPhase: 'initiated',
      totalPhases: 6,
      completedPhases: 0,
      startTime: new Date(),
      errors: [],
      warnings: []
    };

    this.activeHandoffs.set(request.id, {
      requestId: request.id,
      status: 'initiated',
      currentAgentId: request.currentAgentId,
      targetAgentId: '',
      progress
    });

    // Simulate handoff phases
    const phases = [
      { name: 'context_preservation', duration: 1500 },
      { name: 'agent_selection', duration: 1200 },
      { name: 'agent_preparation', duration: 2000 },
      { name: 'context_transfer', duration: 1800 },
      { name: 'finalization', duration: 800 },
      { name: 'completed', duration: 0 }
    ];

    let totalDuration = 0;
    for (const phase of phases) {
      await new Promise(resolve => setTimeout(resolve, phase.duration));
      totalDuration += phase.duration;
      
      progress.currentPhase = phase.name;
      progress.completedPhases++;
      
      console.log(`Handoff phase completed: ${phase.name} (${progress.completedPhases}/${progress.totalPhases})`);
    }

    // Create successful result
    const result = {
      id: `result-${Date.now()}`,
      requestId: request.id,
      success: true,
      newTaskId: `task-continuation-${Date.now()}`,
      newAgentId: 'agent-tech-001',
      selectedAgent: {
        agentId: 'agent-tech-001',
        agentName: 'Technical Analysis Expert',
        agentType: 'technical_analyst'
      },
      preservedContextId: `preserved-${Date.now()}`,
      handoffSummary: {
        contextTransferred: true,
        contextSize: 35840,
        preservationLevel: 'full',
        keyInformation: []
      },
      performanceMetrics: {
        switchLatency: 2500,
        contextTransferTime: 1800,
        agentSelectionTime: 1200,
        handoffPreparationTime: 2000,
        totalSwitchTime: totalDuration,
        contextPreservationRate: 0.85,
        seamlessnessScore: 0.91
      },
      completedAt: new Date(),
      duration: totalDuration
    };

    this.activeHandoffs.delete(request.id);
    this.handoffHistory.push(result);

    return result;
  }

  getHandoffProgress(requestId) {
    const handoff = this.activeHandoffs.get(requestId);
    return handoff ? handoff.progress : null;
  }

  getHandoffStats() {
    const totalHandoffs = this.handoffHistory.length;
    const successfulHandoffs = this.handoffHistory.filter(h => h.success).length;
    const averageDuration = totalHandoffs > 0 
      ? this.handoffHistory.reduce((sum, h) => sum + h.duration, 0) / totalHandoffs 
      : 0;

    return {
      activeHandoffs: this.activeHandoffs.size,
      totalHandoffs,
      successRate: totalHandoffs > 0 ? (successfulHandoffs / totalHandoffs) * 100 : 0,
      averageDuration: Math.round(averageDuration),
      averageSeamlessnessScore: 0.89,
      timestamp: new Date().toISOString()
    };
  }
}

class MockPatternLearning {
  patterns = new Map();
  switchHistory = [];
  insights = [];

  async learnFromSwitchResult(result, request) {
    this.switchHistory.push({ result, request, timestamp: new Date() });
    
    // Simulate pattern detection
    if (this.switchHistory.length % 5 === 0) { // Every 5 switches
      const newPattern = {
        id: `pattern-${Date.now()}`,
        pattern: 'sequential_switch',
        frequency: Math.floor(Math.random() * 20) + 5,
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        successRate: Math.random() * 0.3 + 0.7, // 0.7-1.0
        learnedAt: new Date(),
        lastObserved: new Date(),
        conditions: [
          {
            field: 'currentAgentId',
            operator: 'equals',
            value: request.currentAgentId,
            weight: 1.0
          }
        ],
        outcomes: [
          {
            targetAgentType: result.newAgentId,
            successProbability: result.success ? 0.9 : 0.3,
            averageUserSatisfaction: 0.8,
            averageCompletionTime: result.duration,
            commonIssues: []
          }
        ]
      };
      
      this.patterns.set(newPattern.id, newPattern);
      console.log(`New pattern detected: ${newPattern.pattern} (confidence: ${Math.round(newPattern.confidence * 100)}%)`);
    }

    // Generate insights
    if (this.switchHistory.length % 10 === 0) {
      const insight = {
        type: 'optimization',
        priority: 'medium',
        title: 'Performance Improvement Opportunity',
        description: `Pattern analysis suggests ${Math.round(Math.random() * 20 + 10)}% improvement possible`,
        actionable: true,
        suggestedActions: [
          'Optimize agent pre-loading',
          'Improve context compression',
          'Implement parallel processing'
        ],
        confidence: 0.85,
        discoveredAt: new Date()
      };
      
      this.insights.push(insight);
      console.log(`New insight generated: ${insight.title}`);
    }
  }

  async predictOptimalAgent(request) {
    const matchingPatterns = Array.from(this.patterns.values())
      .filter(p => p.confidence > 0.7);

    if (matchingPatterns.length === 0) {
      return null;
    }

    const bestPattern = matchingPatterns.sort((a, b) => b.confidence - a.confidence)[0];
    
    return {
      suggestedAgent: bestPattern.outcomes[0].targetAgentType,
      confidence: bestPattern.confidence,
      reasoning: [
        `Based on ${matchingPatterns.length} matching patterns`,
        `Primary pattern confidence: ${Math.round(bestPattern.confidence * 100)}%`,
        `Expected success rate: ${Math.round(bestPattern.successRate * 100)}%`
      ],
      basedOnPatterns: [bestPattern.id],
      expectedOutcome: bestPattern.outcomes[0],
      riskFactors: bestPattern.confidence < 0.8 ? ['Pattern confidence below 80%'] : []
    };
  }

  getPatternAnalytics() {
    const totalSwitches = this.switchHistory.length;
    const successfulSwitches = this.switchHistory.filter(h => h.result.success).length;

    return {
      totalSwitches,
      successfulSwitches,
      failedSwitches: totalSwitches - successfulSwitches,
      averageSwitchTime: totalSwitches > 0 
        ? this.switchHistory.reduce((sum, h) => sum + h.result.duration, 0) / totalSwitches 
        : 0,
      mostCommonReasons: {
        user_request: Math.floor(totalSwitches * 0.4),
        performance_degradation: Math.floor(totalSwitches * 0.2),
        capability_mismatch: Math.floor(totalSwitches * 0.15),
        load_balancing: Math.floor(totalSwitches * 0.25)
      },
      agentSwitchMatrix: {
        'agent-basic-001': { 'agent-tech-001': 15, 'agent-risk-002': 8 },
        'agent-tech-001': { 'agent-risk-002': 12, 'agent-basic-001': 5 },
        'agent-risk-002': { 'agent-tech-001': 9, 'agent-basic-001': 6 }
      },
      userSatisfactionTrends: [
        { period: 'last_24h', averageScore: 0.87, sampleSize: 25, trend: 'increasing' },
        { period: 'last_7d', averageScore: 0.82, sampleSize: 150, trend: 'stable' }
      ],
      patternInsights: this.insights.slice(-5),
      performanceMetrics: {
        switchSuccessRate: totalSwitches > 0 ? successfulSwitches / totalSwitches : 0,
        averageHandoffTime: 6200,
        contextPreservationRate: 0.93,
        userRetentionAfterSwitch: 0.89,
        agentUtilizationBalance: 0.76,
        costEfficiencyScore: 0.84
      }
    };
  }

  getLearningInsights() {
    return this.insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }).slice(0, 10);
  }

  async optimizePatterns() {
    const optimizedCount = Math.floor(Math.random() * 5) + 2;
    const newPatternsCount = Math.floor(Math.random() * 3) + 1;
    
    return {
      patternsDetected: newPatternsCount,
      newPatterns: [],
      updatedPatterns: [],
      obsoletePatterns: [],
      confidenceImprovement: 0.05
    };
  }
}

// Initialize mock services
const contextPreservation = new MockContextPreservation();
const smartAgentSelection = new MockSmartAgentSelection();
const seamlessHandoff = new MockSeamlessHandoff();
const patternLearning = new MockPatternLearning();

// Setup Express middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Agent Switching Logic Test Service',
    timestamp: new Date().toISOString(),
    components: {
      contextPreservation: 'operational',
      smartAgentSelection: 'operational',
      seamlessHandoff: 'operational',
      patternLearning: 'operational'
    }
  });
});

// Context Preservation endpoints
app.post('/api/context/snapshot', async (req, res) => {
  const { agentId, sessionId, conversationId, reason } = req.body;
  
  try {
    const snapshot = await contextPreservation.createContextSnapshot(agentId, sessionId, conversationId, reason);
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.post('/api/context/preserve', async (req, res) => {
  const { currentAgentId, sessionId, config } = req.body;
  
  try {
    const result = await contextPreservation.preserveContextForHandoff(currentAgentId, sessionId, config);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.post('/api/context/handoff-summary', async (req, res) => {
  const { preservedContextId, targetAgentId, config } = req.body;
  
  try {
    const summary = await contextPreservation.generateHandoffSummary(preservedContextId, targetAgentId, config);
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Smart Agent Selection endpoints
app.post('/api/agent-selection/select', async (req, res) => {
  const request = req.body;
  
  try {
    const recommendation = await smartAgentSelection.selectBestAgent(request);
    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.get('/api/agent-selection/recommendations/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { limit = 3 } = req.query;
  
  try {
    const recommendations = await smartAgentSelection.getSelectionRecommendations({}, sessionId, parseInt(limit));
    res.json({
      success: true,
      data: {
        sessionId,
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.get('/api/agent-selection/analytics', (req, res) => {
  try {
    const analytics = smartAgentSelection.getSelectionAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Seamless Handoff endpoints
app.post('/api/handoff/initiate', async (req, res) => {
  const request = req.body;
  
  try {
    const result = await seamlessHandoff.initiateHandoff(request);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.get('/api/handoff/progress/:requestId', (req, res) => {
  const { requestId } = req.params;
  
  try {
    const progress = seamlessHandoff.getHandoffProgress(requestId);
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handoff not found' }
      });
    }
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.get('/api/handoff/stats', (req, res) => {
  try {
    const stats = seamlessHandoff.getHandoffStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Pattern Learning endpoints
app.post('/api/pattern-learning/learn', async (req, res) => {
  const { result, request } = req.body;
  
  try {
    await patternLearning.learnFromSwitchResult(result, request);
    res.json({
      success: true,
      data: { message: 'Learning completed successfully' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.post('/api/pattern-learning/predict', async (req, res) => {
  const request = req.body;
  
  try {
    const prediction = await patternLearning.predictOptimalAgent(request);
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.get('/api/pattern-learning/analytics', (req, res) => {
  try {
    const analytics = patternLearning.getPatternAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.get('/api/pattern-learning/insights', (req, res) => {
  try {
    const insights = patternLearning.getLearningInsights();
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.post('/api/pattern-learning/optimize', async (req, res) => {
  try {
    const result = await patternLearning.optimizePatterns();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Complete Agent Switch Test endpoint
app.post('/api/agent-switch/complete-test', async (req, res) => {
  const startTime = Date.now();
  const testId = `test-${Date.now()}`;
  const sessionId = req.body.sessionId || `session-${Date.now()}`;
  
  try {
    console.log(`🧪 Starting complete agent switch test (ID: ${testId})`);
    
    // Step 1: Create context snapshot
    console.log('📸 Step 1: Creating context snapshot...');
    const snapshot = await contextPreservation.createContextSnapshot(
      'agent-basic-001',
      sessionId,
      `conv-${sessionId}`,
      'agent_switch_test'
    );
    
    // Step 2: Create switch request
    const switchRequest = {
      id: `switch-${Date.now()}`,
      currentTaskId: `task-${sessionId}`,
      currentAgentId: 'agent-basic-001',
      reason: 'quality_improvement',
      requesterId: 'test-system',
      requestType: 'immediate',
      targetCriteria: {
        requiredCapabilities: ['technical_analysis', 'chart_patterns'],
        preferredAgentTypes: ['technical_analyst'],
        excludedAgentIds: [],
        minimumSuccessRate: 0.8,
        workloadPreference: 'optimal_performance',
        experienceLevel: 'intermediate',
        communicationStyle: 'technical'
      },
      contextPreservation: {
        preserveFullContext: true,
        preserveConversationHistory: true,
        preserveUserPreferences: true,
        preserveTaskState: true,
        preserveTemporaryData: false,
        contextCompressionLevel: 'light',
        selectivePreservation: {
          priorityThreshold: 0.5,
          preserveRecent: true,
          preserveFrequentlyAccessed: true,
          preserveHighRelevance: true,
          maxContextAge: 24 * 60 * 60 * 1000,
          maxContextSize: 1024 * 1024
        }
      },
      urgency: 'medium',
      metadata: { sessionId, testId },
      createdAt: new Date()
    };
    
    // Step 3: Get agent recommendations
    console.log('🤖 Step 2: Getting agent selection recommendations...');
    const recommendation = await smartAgentSelection.selectBestAgent(switchRequest);
    
    // Step 4: Get predictive analysis
    console.log('🔮 Step 3: Getting predictive analysis...');
    const prediction = await patternLearning.predictOptimalAgent(switchRequest);
    
    // Step 5: Preserve context
    console.log('💾 Step 4: Preserving context for handoff...');
    const preservationResult = await contextPreservation.preserveContextForHandoff(
      switchRequest.currentAgentId,
      sessionId,
      switchRequest.contextPreservation
    );
    
    // Step 6: Execute handoff
    console.log('🔄 Step 5: Executing seamless handoff...');
    const handoffResult = await seamlessHandoff.initiateHandoff(switchRequest);
    
    // Step 7: Generate handoff summary
    console.log('📋 Step 6: Generating handoff summary...');
    const handoffSummary = await contextPreservation.generateHandoffSummary(
      preservationResult.preservedContextId,
      recommendation.suggestedAgent.agentId,
      switchRequest.contextPreservation
    );
    
    // Step 8: Learn from the result
    console.log('🧠 Step 7: Learning from switch result...');
    await patternLearning.learnFromSwitchResult(handoffResult, switchRequest);
    
    // Step 9: Get analytics
    console.log('📊 Step 8: Gathering analytics...');
    const selectionAnalytics = smartAgentSelection.getSelectionAnalytics();
    const handoffStats = seamlessHandoff.getHandoffStats();
    const patternAnalytics = patternLearning.getPatternAnalytics();
    const learningInsights = patternLearning.getLearningInsights();
    
    const totalDuration = Date.now() - startTime;
    
    console.log(`✅ Complete agent switch test completed successfully in ${totalDuration}ms`);
    
    res.json({
      success: true,
      data: {
        testId,
        sessionId,
        duration: totalDuration,
        steps: {
          contextSnapshot: snapshot,
          recommendation,
          prediction,
          preservationResult,
          handoffResult,
          handoffSummary
        },
        analytics: {
          selection: selectionAnalytics,
          handoff: handoffStats,
          patterns: patternAnalytics,
          insights: learningInsights
        },
        summary: {
          success: handoffResult.success,
          fromAgent: switchRequest.currentAgentId,
          toAgent: handoffResult.newAgentId,
          contextPreserved: preservationResult.success,
          seamlessnessScore: handoffResult.performanceMetrics.seamlessnessScore,
          userSatisfactionImpact: recommendation.estimatedImpact.userSatisfactionChange,
          performanceImprovement: recommendation.estimatedImpact.performanceChange
        }
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Complete agent switch test failed after ${duration}ms:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        testId,
        duration
      }
    });
  }
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Agent Switching Logic Test Service',
    version: '1.0.0',
    description: 'Comprehensive test endpoints for Agent Switching Logic functionality',
    components: [
      'Context Preservation Engine',
      'Smart Agent Selection Algorithm',
      'Seamless Handoff Protocol',
      'Switch Pattern Learning'
    ],
    endpoints: {
      health: 'GET /health - Service health check',
      
      // Context Preservation
      createSnapshot: 'POST /api/context/snapshot - Create context snapshot',
      preserveContext: 'POST /api/context/preserve - Preserve context for handoff',
      handoffSummary: 'POST /api/context/handoff-summary - Generate handoff summary',
      
      // Smart Agent Selection
      selectAgent: 'POST /api/agent-selection/select - Select optimal agent',
      getRecommendations: 'GET /api/agent-selection/recommendations/:sessionId - Get agent recommendations',
      selectionAnalytics: 'GET /api/agent-selection/analytics - Get selection analytics',
      
      // Seamless Handoff
      initiateHandoff: 'POST /api/handoff/initiate - Initiate agent handoff',
      handoffProgress: 'GET /api/handoff/progress/:requestId - Get handoff progress',
      handoffStats: 'GET /api/handoff/stats - Get handoff statistics',
      
      // Pattern Learning
      learn: 'POST /api/pattern-learning/learn - Learn from switch result',
      predict: 'POST /api/pattern-learning/predict - Predict optimal agent',
      patternAnalytics: 'GET /api/pattern-learning/analytics - Get pattern analytics',
      insights: 'GET /api/pattern-learning/insights - Get learning insights',
      optimize: 'POST /api/pattern-learning/optimize - Optimize patterns',
      
      // Complete Test
      completeTest: 'POST /api/agent-switch/complete-test - Run complete agent switch test'
    },
    examples: {
      completeTest: {
        method: 'POST',
        url: '/api/agent-switch/complete-test',
        body: {
          sessionId: 'session-12345'
        }
      },
      selectAgent: {
        method: 'POST',
        url: '/api/agent-selection/select',
        body: {
          id: 'switch-123',
          currentAgentId: 'agent-basic-001',
          reason: 'quality_improvement',
          targetCriteria: {
            requiredCapabilities: ['technical_analysis'],
            preferredAgentTypes: ['technical_analyst'],
            minimumSuccessRate: 0.8
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Agent Switching Logic Test Service running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Complete Test: http://localhost:${PORT}/api/agent-switch/complete-test`);
  console.log(`📈 Analytics: http://localhost:${PORT}/api/agent-selection/analytics`);
  console.log(`🧠 Learning Insights: http://localhost:${PORT}/api/pattern-learning/insights`);
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