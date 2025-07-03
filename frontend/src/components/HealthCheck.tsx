import { useState, useEffect } from 'react';
import { apiClient, type HealthData, type ApiResponse } from '../services/api';

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const response: ApiResponse<HealthData> = await apiClient.getHealth();
        
        if (response.success && response.data) {
          setHealth(response.data);
        } else {
          setError(response.error || 'Failed to fetch health data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Health check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    
    // Refresh health data every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-red-700 text-sm font-medium">Backend Offline</span>
        </div>
        <p className="text-red-600 text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const isHealthy = health.status === 'OK' && health.database.connected;
  const statusColor = isHealthy ? 'bg-green-500' : 'bg-yellow-500';
  const statusText = isHealthy ? 'Healthy' : 'Issues Detected';

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 ${statusColor} rounded-full animate-pulse-slow`}></div>
          <div>
            <h3 className="font-semibold text-sm">{health.service}</h3>
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-xs font-mono">v{health.version}</p>
          <p className="text-xs text-muted-foreground">{health.environment}</p>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-muted-foreground">Memory</p>
          <p className="font-mono">{health.memory.used}MB / {health.memory.total}MB</p>
        </div>
        
        <div>
          <p className="text-muted-foreground">Database</p>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${health.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-mono">{health.database.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground">
        Uptime: {Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s
      </div>
    </div>
  );
}