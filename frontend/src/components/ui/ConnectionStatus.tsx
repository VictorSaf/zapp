import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { webSocketService } from '../../services/websocket.service';
import { networkMonitorService } from '../../services/network-monitor.service';
import type { ConnectionQuality, NetworkState } from '../../services/websocket.service';

interface ConnectionStatusProps {
  isVisible?: boolean;
  showDetails?: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isVisible = true, 
  showDetails = false,
  position = 'top-right'
}) => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [quality, setQuality] = useState<ConnectionQuality | null>(null);
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [networkSummary, setNetworkSummary] = useState<any>(null);

  useEffect(() => {
    // Initial status
    setStatus(webSocketService.getConnectionStatus());
    setQuality(webSocketService.getConnectionQuality());
    setNetworkState(webSocketService.getNetworkState());
    setStats(webSocketService.getConnectionStats());
    setNetworkSummary(networkMonitorService.getNetworkSummary());

    // WebSocket event listeners
    const handleConnected = () => {
      setStatus('connected');
      setStats(webSocketService.getConnectionStats());
    };

    const handleDisconnected = () => {
      setStatus('disconnected');
      setStats(webSocketService.getConnectionStats());
    };

    // Remove unused handler

    const handleConnectionError = () => {
      setStatus('error');
      setStats(webSocketService.getConnectionStats());
    };

    const handleQualityUpdate = (data: { quality: ConnectionQuality; networkState: NetworkState }) => {
      setQuality(data.quality);
      setNetworkState(data.networkState);
    };

    const handleReconnectAttempt = ({ attempt }: { attempt: number; maxAttempts: number }) => {
      setStatus('connecting');
      setStats(webSocketService.getConnectionStats());
      console.log(`Reconnection attempt ${attempt}`);
    };

    const handleNetworkOnline = () => {
      setNetworkState(webSocketService.getNetworkState());
    };

    const handleNetworkOffline = () => {
      setNetworkState(webSocketService.getNetworkState());
    };

    // Register event listeners
    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('connection-error', handleConnectionError);
    webSocketService.on('connection-quality-updated', handleQualityUpdate);
    webSocketService.on('reconnect-attempt', handleReconnectAttempt);
    webSocketService.on('network-online', handleNetworkOnline);
    webSocketService.on('network-offline', handleNetworkOffline);

    // Cleanup
    return () => {
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('connection-error', handleConnectionError);
      webSocketService.off('connection-quality-updated', handleQualityUpdate);
      webSocketService.off('reconnect-attempt', handleReconnectAttempt);
      webSocketService.off('network-online', handleNetworkOnline);
      webSocketService.off('network-offline', handleNetworkOffline);
    };
  }, []);

  // Auto-refresh stats and network summary
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(webSocketService.getConnectionStats());
      setNetworkSummary(networkMonitorService.getNetworkSummary());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '⚪';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': 
        return quality 
          ? `Conectat (${quality.quality === 'excellent' ? 'Excelent' : 
              quality.quality === 'good' ? 'Bun' : 
              quality.quality === 'fair' ? 'Acceptabil' : 'Slab'})`
          : 'Conectat';
      case 'connecting': return 'Se conectează...';
      case 'disconnected': return 'Deconectat';
      case 'error': return 'Eroare conexiune';
      default: return 'Necunoscut';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        {/* Main Status Indicator */}
        <motion.button
          onClick={() => setShowDetailPanel(!showDetailPanel)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            hover:shadow-xl transition-all duration-200
            ${status === 'connecting' ? 'animate-pulse' : ''}
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-sm">{getStatusIcon()}</span>
          {showDetails && (
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {getStatusText()}
            </span>
          )}
          {quality && status === 'connected' && (
            <span className="text-xs text-gray-500">
              {Math.round(quality.latency)}ms
            </span>
          )}
        </motion.button>

        {/* Detail Panel */}
        <AnimatePresence>
          {showDetailPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className={`
                absolute ${position.includes('right') ? 'right-0' : 'left-0'} 
                ${position.includes('top') ? 'top-full mt-2' : 'bottom-full mb-2'}
                min-w-80 p-4 rounded-lg shadow-xl
                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              `}
            >
              <div className="space-y-3">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status Conexiune
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon()}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getStatusText()}
                    </span>
                  </div>
                </div>

                {/* Connection Quality */}
                {quality && status === 'connected' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Latență
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(quality.latency)}ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Stabilitate
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${
                              quality.connectionStability > 0.8 ? 'bg-green-500' :
                              quality.connectionStability > 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${quality.connectionStability * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(quality.connectionStability * 100)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Network Information */}
                {networkState && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status Rețea
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {networkState.isOnline ? '🌐 Online' : '📴 Offline'}
                      </span>
                    </div>

                    {networkState.effectiveType && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tip Conexiune
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {networkState.effectiveType.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Connection Statistics */}
                {stats && (
                  <>
                    <hr className="border-gray-200 dark:border-gray-600" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timp Conectat
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(stats.connectionDuration)}
                      </span>
                    </div>

                    {stats.reconnectAttempts > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Încercări Reconectare
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {stats.reconnectAttempts}/{stats.maxReconnectAttempts}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Deconectări
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.disconnectionCount}
                      </span>
                    </div>
                  </>
                )}

                {/* Network Quality Assessment */}
                {networkSummary && (
                  <>
                    <hr className="border-gray-200 dark:border-gray-600" />
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Calitatea Rețelei
                      </h4>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Lățime de bandă
                        </span>
                        <span className={`text-sm px-2 py-1 rounded text-xs font-medium ${
                          networkSummary.quality.bandwidth === 'high' ? 'bg-green-100 text-green-800' :
                          networkSummary.quality.bandwidth === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          networkSummary.quality.bandwidth === 'low' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {networkSummary.quality.bandwidth === 'high' ? 'Mare' :
                           networkSummary.quality.bandwidth === 'medium' ? 'Medie' :
                           networkSummary.quality.bandwidth === 'low' ? 'Mică' : 'Foarte mică'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Stabilitate
                        </span>
                        <span className={`text-sm px-2 py-1 rounded text-xs font-medium ${
                          networkSummary.quality.stability === 'stable' ? 'bg-green-100 text-green-800' :
                          networkSummary.quality.stability === 'unstable' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {networkSummary.quality.stability === 'stable' ? 'Stabilă' :
                           networkSummary.quality.stability === 'unstable' ? 'Instabilă' : 'Slabă'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Recomandare
                        </span>
                        <span className={`text-sm px-2 py-1 rounded text-xs font-medium ${
                          networkSummary.quality.recommendation === 'optimal' ? 'bg-green-100 text-green-800' :
                          networkSummary.quality.recommendation === 'reduced' ? 'bg-yellow-100 text-yellow-800' :
                          networkSummary.quality.recommendation === 'minimal' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {networkSummary.quality.recommendation === 'optimal' ? 'Optimă' :
                           networkSummary.quality.recommendation === 'reduced' ? 'Redusă' :
                           networkSummary.quality.recommendation === 'minimal' ? 'Minimă' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Optimization Suggestions */}
                    {networkSummary.suggestions && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Optimizări Active
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {networkSummary.suggestions.shouldReduceQuality && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <span>🔧</span>
                              <span>Calitate redusă</span>
                            </div>
                          )}
                          
                          {networkSummary.suggestions.shouldEnableCompression && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <span>📦</span>
                              <span>Compresie</span>
                            </div>
                          )}
                          
                          {networkSummary.suggestions.shouldLimitConnections && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <span>⚡</span>
                              <span>Conexiuni limitate</span>
                            </div>
                          )}
                          
                          {networkSummary.suggestions.shouldShowOfflineMode && (
                            <div className="flex items-center gap-1 text-red-600">
                              <span>📴</span>
                              <span>Mod offline</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Conexiuni max: {networkSummary.suggestions.maxConcurrentRequests} | 
                          Update interval: {Math.round(networkSummary.suggestions.recommendedUpdateInterval / 1000)}s
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Reconnect Button */}
                {(status === 'disconnected' || status === 'error') && networkState?.isOnline && (
                  <>
                    <hr className="border-gray-200 dark:border-gray-600" />
                    <button
                      onClick={() => {
                        webSocketService.reconnect();
                        setShowDetailPanel(false);
                      }}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      🔄 Reconectează Manual
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ConnectionStatus;