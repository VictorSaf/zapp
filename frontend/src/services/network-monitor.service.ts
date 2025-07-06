export interface NetworkInformation {
  onLine: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkQuality {
  bandwidth: 'high' | 'medium' | 'low' | 'very-low';
  latency: 'excellent' | 'good' | 'fair' | 'poor';
  stability: 'stable' | 'unstable' | 'poor';
  recommendation: 'optimal' | 'reduced' | 'minimal' | 'offline';
}

export interface NetworkEvent {
  type: 'online' | 'offline' | 'connection-change' | 'quality-change';
  timestamp: Date;
  networkInfo: NetworkInformation;
  quality?: NetworkQuality;
}

type NetworkEventHandler = (event: NetworkEvent) => void;

export class NetworkMonitorService {
  private connection: any = null;
  private isOnline = navigator.onLine;
  private lastQuality: NetworkQuality | null = null;
  private eventHandlers: Map<string, NetworkEventHandler[]> = new Map();
  private monitoringInterval: any = null;
  private lastNetworkInfo: NetworkInformation | null = null;

  constructor() {
    this.setupNetworkMonitoring();
    this.startQualityMonitoring();
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Get connection object if available
    this.connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for connection changes
    if (this.connection) {
      this.connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Initial state
    this.updateNetworkInfo();
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('🌐 Network came online');
    this.isOnline = true;
    this.updateNetworkInfo();
    
    const event: NetworkEvent = {
      type: 'online',
      timestamp: new Date(),
      networkInfo: this.getCurrentNetworkInfo(),
    };
    
    this.emitEvent('online', event);
    this.emitEvent('network-change', event);
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📴 Network went offline');
    this.isOnline = false;
    this.updateNetworkInfo();
    
    const event: NetworkEvent = {
      type: 'offline',
      timestamp: new Date(),
      networkInfo: this.getCurrentNetworkInfo(),
    };
    
    this.emitEvent('offline', event);
    this.emitEvent('network-change', event);
  }

  /**
   * Handle connection change
   */
  private handleConnectionChange(): void {
    console.log('🔄 Network connection changed');
    this.updateNetworkInfo();
    
    const event: NetworkEvent = {
      type: 'connection-change',
      timestamp: new Date(),
      networkInfo: this.getCurrentNetworkInfo(),
      quality: this.getNetworkQuality(),
    };
    
    this.emitEvent('connection-change', event);
    this.emitEvent('network-change', event);
  }

  /**
   * Update network information
   */
  private updateNetworkInfo(): void {
    const currentInfo = this.getCurrentNetworkInfo();
    
    // Check if network info has significantly changed
    if (this.hasNetworkInfoChanged(currentInfo)) {
      this.lastNetworkInfo = currentInfo;
      
      const newQuality = this.getNetworkQuality();
      if (this.hasQualityChanged(newQuality)) {
        this.lastQuality = newQuality;
        
        const event: NetworkEvent = {
          type: 'quality-change',
          timestamp: new Date(),
          networkInfo: currentInfo,
          quality: newQuality,
        };
        
        this.emitEvent('quality-change', event);
      }
    }
  }

  /**
   * Check if network info has significantly changed
   */
  private hasNetworkInfoChanged(newInfo: NetworkInformation): boolean {
    if (!this.lastNetworkInfo) return true;
    
    return (
      this.lastNetworkInfo.onLine !== newInfo.onLine ||
      this.lastNetworkInfo.effectiveType !== newInfo.effectiveType ||
      Math.abs((this.lastNetworkInfo.downlink || 0) - (newInfo.downlink || 0)) > 0.5 ||
      Math.abs((this.lastNetworkInfo.rtt || 0) - (newInfo.rtt || 0)) > 50
    );
  }

  /**
   * Check if quality has changed
   */
  private hasQualityChanged(newQuality: NetworkQuality): boolean {
    if (!this.lastQuality) return true;
    
    return (
      this.lastQuality.bandwidth !== newQuality.bandwidth ||
      this.lastQuality.latency !== newQuality.latency ||
      this.lastQuality.stability !== newQuality.stability ||
      this.lastQuality.recommendation !== newQuality.recommendation
    );
  }

  /**
   * Get current network information
   */
  getCurrentNetworkInfo(): NetworkInformation {
    const info: NetworkInformation = {
      onLine: this.isOnline,
    };

    if (this.connection) {
      info.effectiveType = this.connection.effectiveType;
      info.downlink = this.connection.downlink;
      info.rtt = this.connection.rtt;
      info.saveData = this.connection.saveData;
    }

    return info;
  }

  /**
   * Get network quality assessment
   */
  getNetworkQuality(): NetworkQuality {
    const info = this.getCurrentNetworkInfo();
    
    if (!info.onLine) {
      return {
        bandwidth: 'very-low',
        latency: 'poor',
        stability: 'poor',
        recommendation: 'offline',
      };
    }

    // Assess bandwidth
    let bandwidth: NetworkQuality['bandwidth'] = 'medium';
    if (info.effectiveType) {
      switch (info.effectiveType) {
        case '4g':
          bandwidth = info.downlink && info.downlink > 10 ? 'high' : 'medium';
          break;
        case '3g':
          bandwidth = 'medium';
          break;
        case '2g':
          bandwidth = 'low';
          break;
        case 'slow-2g':
          bandwidth = 'very-low';
          break;
      }
    } else if (info.downlink) {
      if (info.downlink > 10) bandwidth = 'high';
      else if (info.downlink > 2) bandwidth = 'medium';
      else if (info.downlink > 0.5) bandwidth = 'low';
      else bandwidth = 'very-low';
    }

    // Assess latency
    let latency: NetworkQuality['latency'] = 'good';
    if (info.rtt) {
      if (info.rtt < 100) latency = 'excellent';
      else if (info.rtt < 300) latency = 'good';
      else if (info.rtt < 800) latency = 'fair';
      else latency = 'poor';
    }

    // Assess stability (simplified - could be enhanced with historical data)
    const stability: NetworkQuality['stability'] = 
      bandwidth === 'very-low' || latency === 'poor' ? 'poor' :
      bandwidth === 'low' || latency === 'fair' ? 'unstable' : 'stable';

    // Make recommendation
    let recommendation: NetworkQuality['recommendation'];
    if (bandwidth === 'high' && latency === 'excellent' && stability === 'stable') {
      recommendation = 'optimal';
    } else if (bandwidth === 'medium' && latency !== 'poor' && stability !== 'poor') {
      recommendation = 'reduced';
    } else if (bandwidth !== 'very-low' && latency !== 'poor') {
      recommendation = 'minimal';
    } else {
      recommendation = 'offline';
    }

    return { bandwidth, latency, stability, recommendation };
  }

  /**
   * Start quality monitoring
   */
  private startQualityMonitoring(): void {
    // Monitor network quality every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateNetworkInfo();
    }, 30000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    if (this.connection) {
      this.connection.removeEventListener('change', this.handleConnectionChange.bind(this));
    }
  }

  /**
   * Add event listener
   */
  on(eventType: string, handler: NetworkEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, handler?: NetworkEventHandler): void {
    if (!this.eventHandlers.has(eventType)) return;

    if (handler) {
      const handlers = this.eventHandlers.get(eventType)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(eventType);
    }
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(eventType: string, event: NetworkEvent): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in network event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get connection optimization suggestions
   */
  getOptimizationSuggestions(): {
    shouldReduceQuality: boolean;
    shouldEnableCompression: boolean;
    shouldLimitConnections: boolean;
    shouldShowOfflineMode: boolean;
    maxConcurrentRequests: number;
    recommendedUpdateInterval: number;
  } {
    const quality = this.getNetworkQuality();
    const info = this.getCurrentNetworkInfo();

    return {
      shouldReduceQuality: quality.bandwidth === 'low' || quality.bandwidth === 'very-low',
      shouldEnableCompression: quality.bandwidth !== 'high',
      shouldLimitConnections: quality.bandwidth === 'low' || quality.bandwidth === 'very-low',
      shouldShowOfflineMode: !info.onLine || quality.recommendation === 'offline',
      maxConcurrentRequests: 
        quality.bandwidth === 'high' ? 6 :
        quality.bandwidth === 'medium' ? 4 :
        quality.bandwidth === 'low' ? 2 : 1,
      recommendedUpdateInterval:
        quality.recommendation === 'optimal' ? 5000 :
        quality.recommendation === 'reduced' ? 10000 :
        quality.recommendation === 'minimal' ? 20000 : 60000,
    };
  }

  /**
   * Get network summary for debugging
   */
  getNetworkSummary(): {
    info: NetworkInformation;
    quality: NetworkQuality;
    suggestions: ReturnType<NetworkMonitorService['getOptimizationSuggestions']>;
    isSupported: boolean;
  } {
    return {
      info: this.getCurrentNetworkInfo(),
      quality: this.getNetworkQuality(),
      suggestions: this.getOptimizationSuggestions(),
      isSupported: !!this.connection,
    };
  }

  /**
   * Check if network is suitable for real-time features
   */
  isRealTimeSuitable(): boolean {
    const quality = this.getNetworkQuality();
    return quality.recommendation === 'optimal' || quality.recommendation === 'reduced';
  }

  /**
   * Check if we should use fallback mode
   */
  shouldUseFallbackMode(): boolean {
    const quality = this.getNetworkQuality();
    return quality.recommendation === 'minimal' || quality.recommendation === 'offline';
  }
}

// Singleton instance
export const networkMonitorService = new NetworkMonitorService();