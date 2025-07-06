import consul from 'consul';
import config from '@/config';
import logger, { logServiceEvent, logError } from '@/config/logger';

export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  tags: string[];
  meta: Record<string, string>;
  health: 'passing' | 'warning' | 'critical';
}

export interface ServiceDiscoveryOptions {
  serviceName: string;
  serviceId?: string;
  address?: string;
  port: number;
  tags?: string[];
  meta?: Record<string, string>;
  healthCheck?: {
    http?: string;
    interval?: string;
    timeout?: string;
    deregisterCriticalServiceAfter?: string;
  };
}

export class ServiceDiscoveryService {
  private consul: consul.Consul;
  private registeredServices: Set<string> = new Set();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.consul = consul({
      host: config.consul.host,
      port: config.consul.port,
      promisify: true,
    });
  }

  /**
   * Register a service with Consul
   */
  async registerService(options: ServiceDiscoveryOptions): Promise<void> {
    try {
      const serviceId = options.serviceId || `${options.serviceName}-${Date.now()}`;
      const address = options.address || 'localhost';

      const serviceDefinition = {
        id: serviceId,
        name: options.serviceName,
        address,
        port: options.port,
        tags: options.tags || [],
        meta: {
          version: config.serviceVersion,
          environment: config.nodeEnv,
          ...options.meta,
        },
        check: options.healthCheck ? {
          http: options.healthCheck.http || `http://${address}:${options.port}${config.monitoring.healthCheckPath}`,
          interval: options.healthCheck.interval || config.consul.healthCheckInterval,
          timeout: options.healthCheck.timeout || '10s',
          deregisterCriticalServiceAfter: options.healthCheck.deregisterCriticalServiceAfter || '5m',
        } : undefined,
      };

      await this.consul.agent.service.register(serviceDefinition);
      this.registeredServices.add(serviceId);

      logServiceEvent('service_registered', {
        serviceId,
        serviceName: options.serviceName,
        address,
        port: options.port,
      });

      logger.info(`Service ${options.serviceName} registered with Consul`, {
        serviceId,
        address,
        port: options.port,
      });
    } catch (error) {
      logError(error as Error, { operation: 'register_service', options });
      throw new Error(`Failed to register service: ${(error as Error).message}`);
    }
  }

  /**
   * Deregister a service from Consul
   */
  async deregisterService(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.registeredServices.delete(serviceId);

      logServiceEvent('service_deregistered', { serviceId });
      logger.info(`Service ${serviceId} deregistered from Consul`);
    } catch (error) {
      logError(error as Error, { operation: 'deregister_service', serviceId });
      throw new Error(`Failed to deregister service: ${(error as Error).message}`);
    }
  }

  /**
   * Discover services by name
   */
  async discoverServices(serviceName: string, options?: {
    passing?: boolean;
    tags?: string[];
  }): Promise<ServiceInstance[]> {
    try {
      const queryOptions: any = {
        service: serviceName,
      };

      if (options?.passing) {
        queryOptions.passing = true;
      }

      if (options?.tags) {
        queryOptions.tag = options.tags;
      }

      const services = await this.consul.health.service(queryOptions) as any[];

      return services.map(service => ({
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags || [],
        meta: service.Service.Meta || {},
        health: this.getHealthStatus(service.Checks),
      }));
    } catch (error) {
      logError(error as Error, { operation: 'discover_services', serviceName, options });
      throw new Error(`Failed to discover services: ${(error as Error).message}`);
    }
  }

  /**
   * Get a specific service instance (load balancing)
   */
  async getServiceInstance(serviceName: string, strategy: 'round_robin' | 'random' = 'round_robin'): Promise<ServiceInstance | null> {
    try {
      const services = await this.discoverServices(serviceName, { passing: true });

      if (services.length === 0) {
        logger.warn(`No healthy instances found for service: ${serviceName}`);
        return null;
      }

      let selectedService: ServiceInstance;

      switch (strategy) {
        case 'random':
          selectedService = services[Math.floor(Math.random() * services.length)];
          break;
        case 'round_robin':
        default:
          // Simple round-robin (in production, use more sophisticated load balancing)
          const index = Date.now() % services.length;
          selectedService = services[index];
          break;
      }

      logger.debug(`Selected service instance`, {
        serviceName,
        selectedInstance: selectedService.id,
        strategy,
        availableInstances: services.length,
      });

      return selectedService;
    } catch (error) {
      logError(error as Error, { operation: 'get_service_instance', serviceName, strategy });
      return null;
    }
  }

  /**
   * Watch for service changes
   */
  watchServices(serviceName: string, callback: (services: ServiceInstance[]) => void): () => void {
    const watcher = this.consul.watch({
      method: this.consul.health.service,
      options: { service: serviceName, passing: true },
    });

    watcher.on('change', (data: any[]) => {
      const services = data.map(service => ({
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags || [],
        meta: service.Service.Meta || {},
        health: this.getHealthStatus(service.Checks),
      }));

      callback(services);
    });

    watcher.on('error', (error) => {
      logError(error, { operation: 'watch_services', serviceName });
    });

    return () => watcher.end();
  }

  /**
   * Set key-value pair in Consul KV store
   */
  async setKeyValue(key: string, value: any): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.consul.kv.set(key, serializedValue);
      
      logger.debug(`Key-value pair set in Consul`, { key });
    } catch (error) {
      logError(error as Error, { operation: 'set_key_value', key });
      throw new Error(`Failed to set key-value: ${(error as Error).message}`);
    }
  }

  /**
   * Get value from Consul KV store
   */
  async getKeyValue(key: string): Promise<any> {
    try {
      const result = await this.consul.kv.get(key);
      
      if (!result || !result.Value) {
        return null;
      }

      try {
        return JSON.parse(result.Value);
      } catch {
        return result.Value;
      }
    } catch (error) {
      logError(error as Error, { operation: 'get_key_value', key });
      return null;
    }
  }

  /**
   * Start health check monitoring
   */
  startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        for (const serviceId of this.registeredServices) {
          // Update service health status
          await this.consul.agent.check.pass(`service:${serviceId}`);
        }
      } catch (error) {
        logError(error as Error, { operation: 'health_monitoring' });
      }
    }, 30000); // Every 30 seconds

    logServiceEvent('health_monitoring_started');
  }

  /**
   * Stop health check monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logServiceEvent('health_monitoring_stopped');
    }
  }

  /**
   * Graceful shutdown - deregister all services
   */
  async shutdown(): Promise<void> {
    try {
      this.stopHealthMonitoring();

      for (const serviceId of this.registeredServices) {
        await this.deregisterService(serviceId);
      }

      logServiceEvent('service_discovery_shutdown');
      logger.info('Service discovery shutdown completed');
    } catch (error) {
      logError(error as Error, { operation: 'shutdown' });
    }
  }

  /**
   * Determine health status from Consul checks
   */
  private getHealthStatus(checks: any[]): 'passing' | 'warning' | 'critical' {
    if (!checks || checks.length === 0) {
      return 'passing';
    }

    const statuses = checks.map(check => check.Status);
    
    if (statuses.includes('critical')) {
      return 'critical';
    }
    
    if (statuses.includes('warning')) {
      return 'warning';
    }
    
    return 'passing';
  }
}

// Singleton instance
export const serviceDiscovery = new ServiceDiscoveryService();