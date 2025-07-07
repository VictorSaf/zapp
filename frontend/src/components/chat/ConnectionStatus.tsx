import React from 'react'
import { motion } from 'framer-motion'
import { useChatStore } from '../../stores/chat.store'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'
import { socketService } from '../../services/socket.service'

export const ConnectionStatus: React.FC = () => {
  const connectionStatus = useChatStore((state) => state.connectionStatus)

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          label: 'Conectat',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'disconnected':
        return {
          label: 'Deconectat',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'reconnecting':
        return {
          label: 'Reconectare...',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          icon: (
            <motion.svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </motion.svg>
          )
        }
      case 'error':
        return {
          label: 'Eroare conexiune',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        }
    }
  }

  const config = getStatusConfig()

  const handleReconnect = () => {
    socketService.reconnect()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
        config.bgColor,
        config.color
      )}
    >
      {config.icon}
      <span>{config.label}</span>
      
      {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReconnect}
          className="ml-2 px-2 py-0.5 h-6 text-xs"
        >
          Reconectează
        </Button>
      )}
    </motion.div>
  )
}