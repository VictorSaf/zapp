import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../stores/chat.store'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { ConnectionStatus } from './ConnectionStatus'
import { cn } from '../../utils/cn'
import { StaggerChildren } from '../animations'
import { socketService } from '../../services/socket.service'

interface ChatWindowProps {
  className?: string
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ className }) => {
  const { messages, isTyping, currentAgent, activeConversation, processOfflineQueue } = useChatStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, isTyping])
  
  // Process offline queue when connection is restored
  useEffect(() => {
    const checkConnection = () => {
      if (socketService.isConnected()) {
        processOfflineQueue()
      }
    }
    
    const interval = setInterval(checkConnection, 5000)
    return () => clearInterval(interval)
  }, [processOfflineQueue])
  
  const getAgentInfo = (agentId: string) => {
    const agents: Record<string, { name: string; icon: string }> = {
      '00z': { name: '00Z - Personal Assistant', icon: '🤖' },
      'mentor': { name: 'Mentor Agent', icon: '👨‍🏫' },
      'analyst': { name: 'Analyst Agent', icon: '📊' },
      'reporter': { name: 'Reporter Agent', icon: '📰' },
      'strategist': { name: 'Strategist Agent', icon: '♟️' }
    }
    return agents[agentId] || agents['00z']
  }
  
  const agentInfo = getAgentInfo(currentAgent)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden",
        className
      )}
    >
      {/* Chat Header */}
      <motion.div 
        className="px-6 py-4 bg-gradient-to-r from-primary to-primary-dark text-white"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{agentInfo.icon}</span>
            <div>
              <h3 className="font-semibold">{agentInfo.name}</h3>
              <p className="text-sm opacity-90">
                {isTyping ? 'Tastează...' : 'Online'}
              </p>
            </div>
          </div>
          <ConnectionStatus />
        </div>
      </motion.div>
      
      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <span className="text-6xl mb-4">{agentInfo.icon}</span>
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Bun venit la ZAEUS!
              </h4>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Sunt {agentInfo.name}, asistentul tău personal pentru trading. 
                Întreabă-mă orice despre piețe, strategii sau educație financiară.
              </p>
            </motion.div>
          ) : (
            <StaggerChildren>
              <MessageList messages={messages} />
              {isTyping && <TypingIndicator />}
            </StaggerChildren>
          )}
        </AnimatePresence>
      </div>
      
      {/* Chat Input */}
      <ChatInput />
    </motion.div>
  )
}