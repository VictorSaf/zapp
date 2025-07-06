import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import {
  Agent,
  Task,
  TaskResult,
  AgentStatus,
  TaskStatus
} from '@/types/agent.types';
import logger from '@/config/logger';
import { agentRegistry } from './agent-registry.service';
import { taskDistribution } from './task-distribution.service';
import { metricsService } from './metrics.service';

interface AgentConnection {
  agentId: string;
  type: 'http' | 'websocket' | 'grpc';
  connection: AxiosInstance | WebSocket | any;
  lastHeartbeat: Date;
  isActive: boolean;
}

interface MessagePayload {
  type: 'task' | 'heartbeat' | 'status' | 'result' | 'error';
  id: string;
  data: any;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
}

export class AgentCommunicationService extends EventEmitter {
  private connections: Map<string, AgentConnection> = new Map();
  private messageQueue: Map<string, MessagePayload[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  private readonly heartbeatIntervalMs = 30000; // 30 seconds
  private readonly messageTimeoutMs = 60000; // 1 minute
  private readonly maxRetries = 3;

  constructor() {
    super();
    this.setupEventHandlers();
    this.startHeartbeatMonitoring();
  }

  /**
   * Establish connection with an agent
   */
  async connectToAgent(agent: Agent): Promise<void> {
    try {
      const connectionType = this.determineConnectionType(agent);
      let connection: AgentConnection;

      switch (connectionType) {
        case 'websocket':
          connection = await this.createWebSocketConnection(agent);
          break;
        case 'grpc':
          connection = await this.createGrpcConnection(agent);
          break;
        case 'http':
        default:
          connection = await this.createHttpConnection(agent);
          break;
      }

      this.connections.set(agent.id, connection);
      this.messageQueue.set(agent.id, []);

      // Send initial handshake
      await this.sendHandshake(agent.id);

      // Update agent status
      agentRegistry.updateAgentStatus(agent.id, AgentStatus.ACTIVE);

      // Emit connection event
      this.emit('agent:connected', { agentId: agent.id, connectionType });

      logger.info('Connected to agent', {
        agentId: agent.id,
        agentName: agent.name,
        connectionType
      });

    } catch (error) {
      logger.error('Failed to connect to agent', {
        agentId: agent.id,
        error: (error as Error).message
      });

      // Update agent status to error
      agentRegistry.updateAgentStatus(agent.id, AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from an agent
   */
  async disconnectFromAgent(agentId: string): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) {
      logger.warn('No connection found for agent', { agentId });
      return;
    }

    try {
      // Close connection based on type
      if (connection.type === 'websocket' && connection.connection instanceof WebSocket) {
        connection.connection.close();
      } else if (connection.type === 'grpc') {
        // Close gRPC connection
        if (connection.connection.close) {
          connection.connection.close();
        }
      }
      // HTTP connections don't need explicit closing

      // Remove connection
      this.connections.delete(agentId);
      this.messageQueue.delete(agentId);

      // Update agent status
      agentRegistry.updateAgentStatus(agentId, AgentStatus.OFFLINE);

      // Emit disconnection event
      this.emit('agent:disconnected', { agentId });

      logger.info('Disconnected from agent', { agentId });

    } catch (error) {
      logger.error('Error disconnecting from agent', {
        agentId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Send task to agent
   */
  async sendTaskToAgent(agentId: string, task: Task): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection || !connection.isActive) {
      throw new Error(`No active connection to agent ${agentId}`);
    }

    const message: MessagePayload = {
      type: 'task',
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        taskId: task.id,
        type: task.type,
        input: task.input,
        requirements: task.requirements,
        priority: task.priority,
        metadata: task.metadata
      },
      timestamp: new Date(),
      agentId,
      taskId: task.id
    };

    try {
      await this.sendMessage(agentId, message);

      // Update metrics
      metricsService.incrementCounter(
        metricsService.aiRequestsTotal,
        { agent_id: agentId, task_type: task.type }
      );

      logger.info('Task sent to agent', {
        agentId,
        taskId: task.id,
        messageId: message.id
      });

    } catch (error) {
      logger.error('Failed to send task to agent', {
        agentId,
        taskId: task.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Send message to agent
   */
  private async sendMessage(agentId: string, message: MessagePayload): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) {
      throw new Error(`No connection to agent ${agentId}`);
    }

    try {
      switch (connection.type) {
        case 'websocket':
          await this.sendWebSocketMessage(connection, message);
          break;
        case 'grpc':
          await this.sendGrpcMessage(connection, message);
          break;
        case 'http':
          await this.sendHttpMessage(connection, message);
          break;
        default:
          throw new Error(`Unsupported connection type: ${connection.type}`);
      }

      // Add to message queue for tracking
      const queue = this.messageQueue.get(agentId) || [];
      queue.push(message);
      this.messageQueue.set(agentId, queue);

      // Set message timeout
      setTimeout(() => {
        this.handleMessageTimeout(agentId, message.id);
      }, this.messageTimeoutMs);

    } catch (error) {
      logger.error('Failed to send message', {
        agentId,
        messageId: message.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Handle incoming message from agent
   */
  private async handleIncomingMessage(agentId: string, data: any): Promise<void> {
    try {
      const message = this.parseMessage(data);
      
      switch (message.type) {
        case 'result':
          await this.handleTaskResult(agentId, message);
          break;
        case 'error':
          await this.handleTaskError(agentId, message);
          break;
        case 'status':
          await this.handleStatusUpdate(agentId, message);
          break;
        case 'heartbeat':
          await this.handleHeartbeat(agentId, message);
          break;
        default:
          logger.warn('Unknown message type', {
            agentId,
            messageType: message.type,
            messageId: message.id
          });
      }

      // Remove message from queue if it's a response
      if (message.id) {
        this.removeMessageFromQueue(agentId, message.id);
      }

    } catch (error) {
      logger.error('Failed to handle incoming message', {
        agentId,
        error: (error as Error).message,
        data
      });
    }
  }

  /**
   * Handle task result from agent
   */
  private async handleTaskResult(agentId: string, message: MessagePayload): Promise<void> {
    const taskId = message.taskId;
    if (!taskId) {
      logger.warn('Task result missing taskId', { agentId, messageId: message.id });
      return;
    }

    const result: TaskResult = {
      success: true,
      data: message.data.result || message.data,
      confidence: message.data.confidence,
      processingTimeMs: message.data.processingTimeMs || 0,
      agentId,
      agentVersion: message.data.agentVersion || '1.0.0',
      sources: message.data.sources,
      recommendations: message.data.recommendations
    };

    // Update task with result
    await taskDistribution.handleTaskCompletion(taskId, result);

    // Update agent performance
    const agent = agentRegistry.getAgent(agentId);
    if (agent) {
      agentRegistry.updateAgentPerformance(agentId, {
        totalTasks: agent.performance.totalTasks + 1,
        completedTasks: agent.performance.completedTasks + 1,
        averageResponseTimeMs: this.calculateNewAverage(
          agent.performance.averageResponseTimeMs,
          agent.performance.totalTasks,
          result.processingTimeMs
        ),
        successRate: (agent.performance.completedTasks + 1) / (agent.performance.totalTasks + 1)
      });
    }

    // Emit result event
    this.emit('task:result', { agentId, taskId, result });

    logger.info('Task result received', {
      agentId,
      taskId,
      success: result.success,
      processingTimeMs: result.processingTimeMs
    });
  }

  /**
   * Handle task error from agent
   */
  private async handleTaskError(agentId: string, message: MessagePayload): Promise<void> {
    const taskId = message.taskId;
    if (!taskId) {
      logger.warn('Task error missing taskId', { agentId, messageId: message.id });
      return;
    }

    const error = new Error(message.data.message || 'Agent task execution failed');
    
    // Update agent performance
    const agent = agentRegistry.getAgent(agentId);
    if (agent) {
      agentRegistry.updateAgentPerformance(agentId, {
        totalTasks: agent.performance.totalTasks + 1,
        failedTasks: agent.performance.failedTasks + 1,
        successRate: agent.performance.completedTasks / (agent.performance.totalTasks + 1)
      });
    }

    // Handle task failure
    const task = taskDistribution.getTask(taskId);
    if (task) {
      await taskDistribution.handleTaskCompletion(taskId, {
        success: false,
        error: message.data
      });
    }

    // Emit error event
    this.emit('task:error', { agentId, taskId, error: message.data });

    logger.error('Task error received from agent', {
      agentId,
      taskId,
      error: message.data
    });
  }

  /**
   * Handle status update from agent
   */
  private async handleStatusUpdate(agentId: string, message: MessagePayload): Promise<void> {
    const status = message.data.status as AgentStatus;
    
    if (Object.values(AgentStatus).includes(status)) {
      agentRegistry.updateAgentStatus(agentId, status);
      
      // Update connection status
      const connection = this.connections.get(agentId);
      if (connection) {
        connection.isActive = status === AgentStatus.ACTIVE || status === AgentStatus.IDLE;
        this.connections.set(agentId, connection);
      }

      this.emit('agent:status_update', { agentId, status });

      logger.debug('Agent status updated', { agentId, status });
    }
  }

  /**
   * Handle heartbeat from agent
   */
  private async handleHeartbeat(agentId: string, message: MessagePayload): Promise<void> {
    const connection = this.connections.get(agentId);
    if (connection) {
      connection.lastHeartbeat = new Date();
      connection.isActive = true;
      this.connections.set(agentId, connection);
    }

    // Send heartbeat response
    const response: MessagePayload = {
      type: 'heartbeat',
      id: `heartbeat-response-${Date.now()}`,
      data: { status: 'alive', timestamp: new Date() },
      timestamp: new Date()
    };

    await this.sendMessage(agentId, response);

    logger.debug('Heartbeat received from agent', { agentId });
  }

  /**
   * Create HTTP connection to agent
   */
  private async createHttpConnection(agent: Agent): Promise<AgentConnection> {
    const httpClient = axios.create({
      baseURL: agent.configuration.endpoints.primary,
      timeout: agent.configuration.responseTimeoutMs || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ZAEUS-AI-Orchestrator/1.0.0'
      }
    });

    // Test connection
    await httpClient.get('/health');

    return {
      agentId: agent.id,
      type: 'http',
      connection: httpClient,
      lastHeartbeat: new Date(),
      isActive: true
    };
  }

  /**
   * Create WebSocket connection to agent
   */
  private async createWebSocketConnection(agent: Agent): Promise<AgentConnection> {
    return new Promise((resolve, reject) => {
      const wsUrl = agent.configuration.endpoints.websocket || 
                   agent.configuration.endpoints.primary.replace('http', 'ws');
      
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        resolve({
          agentId: agent.id,
          type: 'websocket',
          connection: ws,
          lastHeartbeat: new Date(),
          isActive: true
        });
      });

      ws.on('message', (data) => {
        this.handleIncomingMessage(agent.id, data.toString());
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { agentId: agent.id, error });
        reject(error);
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed', { agentId: agent.id });
        this.handleConnectionLoss(agent.id);
      });

      // Connection timeout
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Create gRPC connection to agent
   */
  private async createGrpcConnection(agent: Agent): Promise<AgentConnection> {
    // This would implement gRPC client connection
    // For now, falling back to HTTP
    return this.createHttpConnection(agent);
  }

  /**
   * Determine best connection type for agent
   */
  private determineConnectionType(agent: Agent): 'http' | 'websocket' | 'grpc' {
    if (agent.configuration.endpoints.websocket) {
      return 'websocket';
    }
    
    if (agent.configuration.endpoints.primary.includes('grpc')) {
      return 'grpc';
    }
    
    return 'http';
  }

  /**
   * Send WebSocket message
   */
  private async sendWebSocketMessage(connection: AgentConnection, message: MessagePayload): Promise<void> {
    if (connection.connection instanceof WebSocket) {
      if (connection.connection.readyState === WebSocket.OPEN) {
        connection.connection.send(JSON.stringify(message));
      } else {
        throw new Error('WebSocket connection not open');
      }
    }
  }

  /**
   * Send HTTP message
   */
  private async sendHttpMessage(connection: AgentConnection, message: MessagePayload): Promise<void> {
    if (connection.connection && typeof connection.connection.post === 'function') {
      const endpoint = this.getHttpEndpointForMessageType(message.type);
      await connection.connection.post(endpoint, message);
    }
  }

  /**
   * Send gRPC message
   */
  private async sendGrpcMessage(connection: AgentConnection, message: MessagePayload): Promise<void> {
    // Implement gRPC message sending
    throw new Error('gRPC messaging not implemented yet');
  }

  /**
   * Get HTTP endpoint for message type
   */
  private getHttpEndpointForMessageType(messageType: string): string {
    switch (messageType) {
      case 'task':
        return '/tasks';
      case 'heartbeat':
        return '/heartbeat';
      default:
        return '/messages';
    }
  }

  /**
   * Parse incoming message
   */
  private parseMessage(data: any): MessagePayload {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  }

  /**
   * Send handshake to agent
   */
  private async sendHandshake(agentId: string): Promise<void> {
    const handshake: MessagePayload = {
      type: 'handshake',
      id: `handshake-${Date.now()}`,
      data: {
        orchestratorId: 'zaeus-ai-orchestrator',
        version: '1.0.0',
        capabilities: ['task_distribution', 'load_balancing', 'monitoring'],
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    await this.sendMessage(agentId, handshake);
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLoss(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (connection) {
      connection.isActive = false;
      this.connections.set(agentId, connection);
    }

    agentRegistry.updateAgentStatus(agentId, AgentStatus.OFFLINE);
    this.emit('agent:connection_lost', { agentId });

    logger.warn('Agent connection lost', { agentId });
  }

  /**
   * Handle message timeout
   */
  private handleMessageTimeout(agentId: string, messageId: string): void {
    const queue = this.messageQueue.get(agentId);
    if (queue) {
      const messageIndex = queue.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        const message = queue[messageIndex];
        logger.warn('Message timeout', {
          agentId,
          messageId,
          messageType: message.type
        });

        // Remove timed out message
        queue.splice(messageIndex, 1);
        this.messageQueue.set(agentId, queue);

        // Emit timeout event
        this.emit('message:timeout', { agentId, messageId, message });
      }
    }
  }

  /**
   * Remove message from queue
   */
  private removeMessageFromQueue(agentId: string, messageId: string): void {
    const queue = this.messageQueue.get(agentId);
    if (queue) {
      const filteredQueue = queue.filter(msg => msg.id !== messageId);
      this.messageQueue.set(agentId, filteredQueue);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatIntervalMs);
  }

  /**
   * Check heartbeats for all connections
   */
  private checkHeartbeats(): void {
    const now = new Date();
    const heartbeatTimeout = 2 * this.heartbeatIntervalMs; // 2x interval

    for (const [agentId, connection] of this.connections) {
      const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > heartbeatTimeout && connection.isActive) {
        logger.warn('Agent heartbeat timeout', {
          agentId,
          timeSinceLastHeartbeat,
          threshold: heartbeatTimeout
        });

        this.handleConnectionLoss(agentId);
      }
    }
  }

  /**
   * Calculate new average
   */
  private calculateNewAverage(currentAvg: number, count: number, newValue: number): number {
    return (currentAvg * count + newValue) / (count + 1);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('agent:connected', (event) => {
      logger.debug('Agent connected event', event);
    });

    this.on('agent:disconnected', (event) => {
      logger.debug('Agent disconnected event', event);
    });

    this.on('task:result', (event) => {
      logger.debug('Task result event', { 
        agentId: event.agentId, 
        taskId: event.taskId,
        success: event.result.success 
      });
    });

    this.on('task:error', (event) => {
      logger.debug('Task error event', { 
        agentId: event.agentId, 
        taskId: event.taskId 
      });
    });
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats() {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;
    
    const connectionsByType = Array.from(this.connections.values())
      .reduce((acc, conn) => {
        acc[conn.type] = (acc[conn.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const totalQueuedMessages = Array.from(this.messageQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);

    return {
      totalConnections,
      activeConnections,
      connectionsByType,
      totalQueuedMessages,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Agent Communication Service...');

    // Stop heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Disconnect from all agents
    const disconnectPromises = Array.from(this.connections.keys())
      .map(agentId => this.disconnectFromAgent(agentId));
    
    await Promise.all(disconnectPromises);

    // Clear all data
    this.connections.clear();
    this.messageQueue.clear();

    logger.info('Agent Communication Service shutdown complete');
  }
}

export const agentCommunication = new AgentCommunicationService();