import React from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';
import { Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus, connectWebSocket } = useChatStore();
  
  const getStatusConfig = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Conectat',
          description: 'Chat în timp real activ'
        };
      case 'connecting':
        return {
          icon: RotateCcw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Se conectează...',
          description: 'Stabilire conexiune'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Eroare conexiune',
          description: `Încercări: ${connectionStatus.reconnectAttempts}`
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-slate-500',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          text: 'Deconectat',
          description: 'Chat offline'
        };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  const handleReconnect = () => {
    if (connectionStatus.status !== 'connecting') {
      connectWebSocket();
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between px-3 py-2 border rounded-lg ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center space-x-2">
        <motion.div
          animate={{
            rotate: connectionStatus.status === 'connecting' ? 360 : 0
          }}
          transition={{
            duration: 1,
            repeat: connectionStatus.status === 'connecting' ? Infinity : 0,
            ease: 'linear'
          }}
        >
          <Icon className={`w-4 h-4 ${config.color}`} />
        </motion.div>
        
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${config.color}`}>
            {config.text}
          </span>
          <span className="text-xs text-slate-500">
            {config.description}
          </span>
        </div>
      </div>
      
      {(connectionStatus.status === 'disconnected' || connectionStatus.status === 'error') && (
        <button
          onClick={handleReconnect}
          className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
        >
          Reconectează
        </button>
      )}
      
      {connectionStatus.lastConnected && (
        <span className="text-xs text-slate-400">
          {connectionStatus.lastConnected.toLocaleTimeString('ro-RO')}
        </span>
      )}
    </motion.div>
  );
};

export default ConnectionStatus;