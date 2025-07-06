import { v4 as uuidv4 } from 'uuid';
import config from '@/config';
import logger, { logError } from '@/config/logger';
import { metricsService } from '@/services/metrics.service';
import { queueService } from '@/services/queue.service';

export class AIOrchestratorService {
  
  /**
   * Process agent request
   */
  async processAgentRequest(request: any): Promise<any> {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      logger.info('Processing agent request', {
        requestId,
        agentId: request.agent_id,
        userId: request.user_id,
        conversationId: request.conversation_id,
      });

      // Increment AI requests in flight
      metricsService.incrementAiRequestsInFlight(request.agent_id);
      
      // Validate request
      if (!request.agent_id || !request.messages || request.messages.length === 0) {
        throw new Error('Invalid agent request: missing agent_id or messages');
      }

      // Queue the agent request for processing
      const jobData = {
        id: requestId,
        type: 'agent_request',
        payload: {
          agentId: request.agent_id,
          userId: request.user_id,
          conversationId: request.conversation_id,
          messages: request.messages,
          context: request.context || {},
          config: request.config || {},
        },
        userId: request.user_id,
        conversationId: request.conversation_id,
        agentId: request.agent_id,
        priority: 5, // High priority for agent requests
        timestamp: new Date(),
      };

      await queueService.addJob('ai-processing', jobData, {
        priority: 5,
        attempts: 3,
        removeOnComplete: 50,
        removeOnFail: 25,
      });

      // For now, return a mock response (in production, this would be async with callbacks)
      const response = {
        response_id: requestId,
        agent_id: request.agent_id,
        content: `Response from agent ${request.agent_id} for conversation ${request.conversation_id}`,
        model_used: request.config?.model || 'llama3.2',
        provider: 'ollama',
        processing_time_ms: Date.now() - startTime,
        token_count: 150,
        cost_usd: 0.001,
        status: 'SUCCESS',
        metadata: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
        },
      };

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordAiRequest(request.agent_id, request.config?.model || 'llama3.2', 'success', duration);
      metricsService.recordModelInvocation(request.config?.model || 'llama3.2', 'ollama', 'success');

      logger.info('Agent request processed successfully', {
        requestId,
        agentId: request.agent_id,
        duration,
      });

      return response;

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordAiRequest(request.agent_id, request.config?.model || 'unknown', 'error', duration);
      
      logError(error as Error, {
        operation: 'process_agent_request',
        requestId,
        agentId: request.agent_id,
      });

      throw error;
    } finally {
      metricsService.decrementAiRequestsInFlight(request.agent_id);
    }
  }

  /**
   * Switch agent
   */
  async switchAgent(request: any): Promise<any> {
    try {
      logger.info('Switching agent', {
        conversationId: request.conversation_id,
        fromAgent: request.from_agent_id,
        toAgent: request.to_agent_id,
        reason: request.reason,
      });

      // Record agent switch metrics
      metricsService.recordAgentSwitch(
        request.from_agent_id,
        request.to_agent_id,
        request.reason || 'user_request'
      );

      // Queue agent switch task
      const jobData = {
        id: uuidv4(),
        type: 'agent_switch',
        payload: {
          conversationId: request.conversation_id,
          fromAgentId: request.from_agent_id,
          toAgentId: request.to_agent_id,
          reason: request.reason,
          userId: request.user_id,
        },
        userId: request.user_id,
        conversationId: request.conversation_id,
        priority: 7, // High priority for agent switches
        timestamp: new Date(),
      };

      await queueService.addJob('agent-orchestration', jobData);

      return {
        success: true,
        message: `Agent switched from ${request.from_agent_id} to ${request.to_agent_id}`,
        switch_id: uuidv4(),
        timestamp: Date.now(),
      };

    } catch (error) {
      logError(error as Error, { operation: 'switch_agent', request });
      throw error;
    }
  }

  /**
   * Get active agents
   */
  async getActiveAgents(request: any): Promise<any> {
    try {
      logger.debug('Getting active agents', {
        userId: request.user_id,
        agentTypes: request.agent_types,
      });

      // Mock active agents (in production, fetch from database)
      const agents = [
        {
          agent_id: 'agent_00z',
          agent_name: 'agent_00z',
          agent_type: 'central',
          display_name: 'Agent 00Z',
          description: 'Central AI agent for trading education',
          capabilities: ['conversation', 'education', 'analysis'],
          is_active: true,
          status: 'IDLE',
          metadata: {
            last_activity: new Date().toISOString(),
            model: 'llama3.2',
          },
        },
        {
          agent_id: 'agent_mentor',
          agent_name: 'mentor',
          agent_type: 'mentor',
          display_name: 'Trading Mentor',
          description: 'Educational mentor for trading concepts',
          capabilities: ['education', 'mentoring', 'guidance'],
          is_active: true,
          status: 'IDLE',
          metadata: {
            last_activity: new Date().toISOString(),
            model: 'llama3.2',
          },
        },
      ];

      // Filter by agent types if specified
      let filteredAgents = agents;
      if (request.agent_types && request.agent_types.length > 0) {
        filteredAgents = agents.filter(agent => 
          request.agent_types.includes(agent.agent_type)
        );
      }

      return {
        agents: filteredAgents,
        total_count: filteredAgents.length,
      };

    } catch (error) {
      logError(error as Error, { operation: 'get_active_agents', request });
      throw error;
    }
  }

  /**
   * Orchestrate tasks
   */
  async orchestrateTasks(request: any): Promise<any> {
    const orchestrationId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info('Orchestrating tasks', {
        orchestrationId,
        taskId: request.task_id,
        taskType: request.task_type,
        agentTasksCount: request.agent_tasks?.length || 0,
      });

      // Queue orchestration task
      const jobData = {
        id: orchestrationId,
        type: 'task_orchestration',
        payload: {
          taskId: request.task_id,
          userId: request.user_id,
          conversationId: request.conversation_id,
          taskType: request.task_type,
          agentTasks: request.agent_tasks || [],
          strategy: request.strategy || 'ROUND_ROBIN',
          timeoutSeconds: request.timeout_seconds || 60,
          context: request.context || {},
        },
        userId: request.user_id,
        conversationId: request.conversation_id,
        priority: 6,
        timestamp: new Date(),
      };

      await queueService.addJob('agent-orchestration', jobData);

      // Mock orchestration response
      const results = (request.agent_tasks || []).map((task: any) => ({
        task_id: task.task_id,
        agent_id: task.agent_id,
        success: true,
        result: `Task ${task.task_id} completed by ${task.agent_id}`,
        error_message: '',
        processing_time: Math.random() * 5000 + 1000, // Random processing time
        metadata: {
          timestamp: new Date().toISOString(),
        },
      }));

      return {
        orchestration_id: orchestrationId,
        success: true,
        results,
        final_result: 'All tasks completed successfully',
        total_processing_time: Date.now() - startTime,
        status: 'COMPLETED',
        error_message: '',
      };

    } catch (error) {
      logError(error as Error, { operation: 'orchestrate_tasks', orchestrationId, request });
      throw error;
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(request: any): Promise<any> {
    try {
      logger.debug('Getting task status', {
        taskId: request.task_id,
        userId: request.user_id,
      });

      // Mock task status (in production, fetch from database/cache)
      return {
        task_id: request.task_id,
        status: 'IN_PROGRESS',
        progress_percentage: 75.5,
        agent_statuses: [
          {
            agent_id: 'agent_00z',
            task_id: request.task_id,
            status: 'COMPLETED_SUCCESS',
            progress: 100.0,
            current_operation: 'Task completed',
          },
          {
            agent_id: 'agent_mentor',
            task_id: request.task_id,
            status: 'IN_PROGRESS',
            progress: 50.0,
            current_operation: 'Processing user input',
          },
        ],
        elapsed_time: 45000, // 45 seconds
        estimated_completion: 15000, // 15 seconds remaining
      };

    } catch (error) {
      logError(error as Error, { operation: 'get_task_status', request });
      throw error;
    }
  }

  /**
   * Cancel task
   */
  async cancelTask(request: any): Promise<any> {
    try {
      logger.info('Cancelling task', {
        taskId: request.task_id,
        userId: request.user_id,
        reason: request.reason,
      });

      // Queue task cancellation
      const jobData = {
        id: uuidv4(),
        type: 'task_cancellation',
        payload: {
          taskId: request.task_id,
          userId: request.user_id,
          reason: request.reason || 'user_request',
        },
        userId: request.user_id,
        priority: 10, // Highest priority for cancellations
        timestamp: new Date(),
      };

      await queueService.addJob('agent-orchestration', jobData);

      return {
        success: true,
        message: `Task ${request.task_id} cancellation requested`,
        timestamp: Date.now(),
      };

    } catch (error) {
      logError(error as Error, { operation: 'cancel_task', request });
      throw error;
    }
  }

  /**
   * Store context
   */
  async storeContext(request: any): Promise<any> {
    try {
      logger.debug('Storing context', {
        contextId: request.context_id,
        userId: request.user_id,
        agentId: request.agent_id,
        contextType: request.context_type,
      });

      // Queue context storage
      const jobData = {
        id: uuidv4(),
        type: 'context_storage',
        payload: {
          contextId: request.context_id,
          userId: request.user_id,
          agentId: request.agent_id,
          conversationId: request.conversation_id,
          contextType: request.context_type,
          contextData: request.context_data,
          metadata: request.metadata || {},
          ttlSeconds: request.ttl_seconds || 3600, // 1 hour default
        },
        userId: request.user_id,
        conversationId: request.conversation_id,
        agentId: request.agent_id,
        priority: 3,
        timestamp: new Date(),
      };

      await queueService.addJob('memory-context', jobData);

      return {
        success: true,
        context_id: request.context_id,
        message: 'Context stored successfully',
        timestamp: Date.now(),
      };

    } catch (error) {
      logError(error as Error, { operation: 'store_context', request });
      throw error;
    }
  }

  /**
   * Get context
   */
  async getContext(request: any): Promise<any> {
    try {
      logger.debug('Getting context', {
        contextId: request.context_id,
        userId: request.user_id,
        agentId: request.agent_id,
        contextType: request.context_type,
      });

      // Mock context retrieval (in production, fetch from database/cache)
      return {
        found: true,
        context_id: request.context_id,
        context_data: Buffer.from(JSON.stringify({
          conversation_history: [],
          user_preferences: {},
          agent_memory: {},
        })),
        metadata: {
          version: '1.0',
          created_by: request.agent_id,
        },
        created_at: Date.now() - 86400000, // 1 day ago
        updated_at: Date.now() - 3600000,  // 1 hour ago
      };

    } catch (error) {
      logError(error as Error, { operation: 'get_context', request });
      throw error;
    }
  }

  /**
   * Update context
   */
  async updateContext(request: any): Promise<any> {
    try {
      logger.debug('Updating context', {
        contextId: request.context_id,
        userId: request.user_id,
      });

      // Queue context update
      const jobData = {
        id: uuidv4(),
        type: 'context_update',
        payload: {
          contextId: request.context_id,
          userId: request.user_id,
          contextData: request.context_data,
          metadata: request.metadata || {},
        },
        userId: request.user_id,
        priority: 3,
        timestamp: new Date(),
      };

      await queueService.addJob('memory-context', jobData);

      return {
        success: true,
        message: 'Context updated successfully',
        timestamp: Date.now(),
      };

    } catch (error) {
      logError(error as Error, { operation: 'update_context', request });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(request: any): Promise<any> {
    try {
      const queueHealth = await queueService.getQueueHealth();
      
      return {
        status: queueHealth.healthy ? 'HEALTHY' : 'DEGRADED',
        message: queueHealth.healthy ? 'Service is healthy' : 'Service has issues',
        timestamp: Date.now(),
        details: {
          service: config.serviceName,
          version: config.serviceVersion,
          uptime: process.uptime().toString(),
          queue_health: queueHealth.healthy.toString(),
          queue_issues: queueHealth.issues.join(', '),
        },
      };

    } catch (error) {
      logError(error as Error, { operation: 'health_check' });
      
      return {
        status: 'UNHEALTHY',
        message: 'Health check failed',
        timestamp: Date.now(),
        details: {
          error: (error as Error).message,
        },
      };
    }
  }
}