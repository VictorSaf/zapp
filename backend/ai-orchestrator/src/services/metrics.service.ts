import client from 'prom-client';
import config from '@/config';
import logger from '@/config/logger';

export class MetricsService {
  private registry: client.Registry;
  
  // HTTP Metrics
  private httpRequestsTotal: client.Counter<string>;
  private httpRequestDuration: client.Histogram<string>;
  private httpRequestsInFlight: client.Gauge<string>;
  
  // AI Orchestration Metrics
  private aiRequestsTotal: client.Counter<string>;
  private aiRequestDuration: client.Histogram<string>;
  private aiRequestsInFlight: client.Gauge<string>;
  private aiModelInvocations: client.Counter<string>;
  
  // Agent Metrics
  private agentSwitches: client.Counter<string>;
  private activeAgents: client.Gauge<string>;
  private agentResponseTime: client.Histogram<string>;
  
  // Service Discovery Metrics
  private serviceInstancesTotal: client.Gauge<string>;
  private serviceHealthChecks: client.Counter<string>;
  
  // Queue Metrics
  private queueJobsTotal: client.Counter<string>;
  private queueJobDuration: client.Histogram<string>;
  private queueActiveJobs: client.Gauge<string>;
  
  // System Metrics
  private systemMemoryUsage: client.Gauge<string>;
  private systemCpuUsage: client.Gauge<string>;
  private systemUptime: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();
    
    // Add default metrics
    client.collectDefaultMetrics({ 
      register: this.registry,
      prefix: 'zaeus_ai_orchestrator_',
    });
    
    this.initializeMetrics();
    this.startSystemMetricsCollection();
  }

  /**
   * Initialize all custom metrics
   */
  private initializeMetrics(): void {
    // HTTP Metrics
    this.httpRequestsTotal = new client.Counter({
      name: 'zaeus_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'zaeus_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new client.Gauge({
      name: 'zaeus_http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      registers: [this.registry],
    });

    // AI Orchestration Metrics
    this.aiRequestsTotal = new client.Counter({
      name: 'zaeus_ai_requests_total',
      help: 'Total number of AI orchestration requests',
      labelNames: ['agent_id', 'status', 'model'],
      registers: [this.registry],
    });

    this.aiRequestDuration = new client.Histogram({
      name: 'zaeus_ai_request_duration_seconds',
      help: 'Duration of AI requests in seconds',
      labelNames: ['agent_id', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [this.registry],
    });

    this.aiRequestsInFlight = new client.Gauge({
      name: 'zaeus_ai_requests_in_flight',
      help: 'Number of AI requests currently being processed',
      labelNames: ['agent_id'],
      registers: [this.registry],
    });

    this.aiModelInvocations = new client.Counter({
      name: 'zaeus_ai_model_invocations_total',
      help: 'Total number of AI model invocations',
      labelNames: ['model', 'provider', 'status'],
      registers: [this.registry],
    });

    // Agent Metrics
    this.agentSwitches = new client.Counter({
      name: 'zaeus_agent_switches_total',
      help: 'Total number of agent switches',
      labelNames: ['from_agent', 'to_agent', 'reason'],
      registers: [this.registry],
    });

    this.activeAgents = new client.Gauge({
      name: 'zaeus_active_agents',
      help: 'Number of currently active agents',
      labelNames: ['agent_type'],
      registers: [this.registry],
    });

    this.agentResponseTime = new client.Histogram({
      name: 'zaeus_agent_response_time_seconds',
      help: 'Agent response time in seconds',
      labelNames: ['agent_id', 'agent_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 15, 30],
      registers: [this.registry],
    });

    // Service Discovery Metrics
    this.serviceInstancesTotal = new client.Gauge({
      name: 'zaeus_service_instances_total',
      help: 'Total number of service instances',
      labelNames: ['service_name', 'health_status'],
      registers: [this.registry],
    });

    this.serviceHealthChecks = new client.Counter({
      name: 'zaeus_service_health_checks_total',
      help: 'Total number of service health checks',
      labelNames: ['service_name', 'status'],
      registers: [this.registry],
    });

    // Queue Metrics
    this.queueJobsTotal = new client.Counter({
      name: 'zaeus_queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue_name', 'status'],
      registers: [this.registry],
    });

    this.queueJobDuration = new client.Histogram({
      name: 'zaeus_queue_job_duration_seconds',
      help: 'Queue job processing duration in seconds',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
      registers: [this.registry],
    });

    this.queueActiveJobs = new client.Gauge({
      name: 'zaeus_queue_active_jobs',
      help: 'Number of active jobs in queue',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    // System Metrics
    this.systemMemoryUsage = new client.Gauge({
      name: 'zaeus_system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.systemCpuUsage = new client.Gauge({
      name: 'zaeus_system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      registers: [this.registry],
    });

    this.systemUptime = new client.Gauge({
      name: 'zaeus_system_uptime_seconds',
      help: 'System uptime in seconds',
      registers: [this.registry],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  /**
   * Track HTTP requests in flight
   */
  incrementHttpRequestsInFlight(): void {
    this.httpRequestsInFlight.inc();
  }

  decrementHttpRequestsInFlight(): void {
    this.httpRequestsInFlight.dec();
  }

  /**
   * Record AI request metrics
   */
  recordAiRequest(agentId: string, model: string, status: string, duration: number): void {
    const labels = { agent_id: agentId, status, model };
    
    this.aiRequestsTotal.inc(labels);
    this.aiRequestDuration.observe({ agent_id: agentId, model }, duration);
  }

  /**
   * Track AI requests in flight
   */
  incrementAiRequestsInFlight(agentId: string): void {
    this.aiRequestsInFlight.inc({ agent_id: agentId });
  }

  decrementAiRequestsInFlight(agentId: string): void {
    this.aiRequestsInFlight.dec({ agent_id: agentId });
  }

  /**
   * Record AI model invocation
   */
  recordModelInvocation(model: string, provider: string, status: string): void {
    this.aiModelInvocations.inc({ model, provider, status });
  }

  /**
   * Record agent switch
   */
  recordAgentSwitch(fromAgent: string, toAgent: string, reason: string): void {
    this.agentSwitches.inc({ from_agent: fromAgent, to_agent: toAgent, reason });
  }

  /**
   * Update active agents count
   */
  setActiveAgents(agentType: string, count: number): void {
    this.activeAgents.set({ agent_type: agentType }, count);
  }

  /**
   * Record agent response time
   */
  recordAgentResponseTime(agentId: string, agentType: string, duration: number): void {
    this.agentResponseTime.observe({ agent_id: agentId, agent_type: agentType }, duration);
  }

  /**
   * Update service instances count
   */
  setServiceInstances(serviceName: string, healthStatus: string, count: number): void {
    this.serviceInstancesTotal.set({ service_name: serviceName, health_status: healthStatus }, count);
  }

  /**
   * Record service health check
   */
  recordHealthCheck(serviceName: string, status: string): void {
    this.serviceHealthChecks.inc({ service_name: serviceName, status });
  }

  /**
   * Record queue job metrics
   */
  recordQueueJob(queueName: string, jobType: string, status: string, duration: number): void {
    this.queueJobsTotal.inc({ queue_name: queueName, status });
    this.queueJobDuration.observe({ queue_name: queueName, job_type: jobType }, duration);
  }

  /**
   * Update active queue jobs
   */
  setActiveQueueJobs(queueName: string, count: number): void {
    this.queueActiveJobs.set({ queue_name: queueName }, count);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics registry
   */
  getRegistry(): client.Registry {
    return this.registry;
  }

  /**
   * Start collecting system metrics
   */
  private startSystemMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const memUsage = process.memoryUsage();
      
      // Memory metrics
      this.systemMemoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.systemMemoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.systemMemoryUsage.set({ type: 'external' }, memUsage.external);
      this.systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);

      // Uptime
      this.systemUptime.set(process.uptime());

      // CPU usage (simplified - in production use more sophisticated monitoring)
      const usage = process.cpuUsage();
      const cpuPercent = (usage.user + usage.system) / 1000000 / process.uptime() * 100;
      this.systemCpuUsage.set(Math.min(cpuPercent, 100));

    } catch (error) {
      logger.error('Failed to collect system metrics', { error });
    }
  }

  /**
   * Create a timer for measuring duration
   */
  createTimer(metric: client.Histogram<string>, labels?: client.LabelValues<string>): () => void {
    const end = metric.startTimer(labels);
    return end;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.registry.clear();
    this.initializeMetrics();
  }
}

// Singleton instance
export const metricsService = new MetricsService();