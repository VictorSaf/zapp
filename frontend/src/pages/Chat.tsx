import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChatWindow } from '../components/chat'
import { PageTransition } from '../components/animations'
import { AnimatedButton } from '../components/animations/AnimatedButton'
import { useChatStore } from '../stores/chat.store'
import { chatService } from '../services/chat.service'
import { socketService } from '../services/socket.service'
import { useAuthStore } from '../stores/auth.store'
import { cn } from '../utils/cn'

export const Chat: React.FC = () => {
  const navigate = useNavigate()
  const { currentAgent, setCurrentAgent, activeConversation, setActiveConversation, setConversations } = useChatStore()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  
  const agents = [
    { id: '00z', name: '00Z Assistant', icon: '🤖', description: 'Asistent general' },
    { id: 'mentor', name: 'Mentor', icon: '👨‍🏫', description: 'Educație trading' },
    { id: 'analyst', name: 'Analyst', icon: '📊', description: 'Analiză tehnică' },
    { id: 'reporter', name: 'Reporter', icon: '📰', description: 'Știri piață' },
    { id: 'strategist', name: 'Strategist', icon: '♟️', description: 'Strategii trading' }
  ]
  
  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])
  
  // Create or load conversation when agent changes
  useEffect(() => {
    if (currentAgent && user) {
      createOrLoadConversation()
    }
  }, [currentAgent, user])
  
  const loadConversations = async () => {
    try {
      const conversations = await chatService.getConversations()
      setConversations(conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        agentId: conv.agentId,
        userId: conv.userId,
        lastMessage: undefined,
        lastMessageAt: undefined
      })))
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }
  
  const createOrLoadConversation = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Create a new conversation for this agent
      const conversation = await chatService.createConversation({
        agentId: currentAgent,
        title: `Chat cu ${agents.find(a => a.id === currentAgent)?.name}`
      })
      
      const newConv = {
        id: conversation.id,
        title: conversation.title,
        agentId: conversation.agentId,
        userId: conversation.userId,
        lastMessage: undefined,
        lastMessageAt: undefined
      }
      
      setActiveConversation(newConv)
      
      // Join the conversation room via WebSocket
      if (socketService.isConnected()) {
        socketService.joinConversation(conversation.id)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <AnimatedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Dashboard</span>
                </AnimatedButton>
                
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  ZAEUS Chat
                </h1>
              </div>
              
              {/* Agent Selector */}
              <div className="flex items-center space-x-2">
                {agents.map((agent) => (
                  <motion.button
                    key={agent.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentAgent(agent.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2",
                      currentAgent === agent.id
                        ? "bg-primary text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                    title={agent.description}
                  >
                    <span className="text-lg">{agent.icon}</span>
                    <span className="text-sm font-medium hidden sm:inline">{agent.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.header>
        
        {/* Chat Container */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="h-[calc(100vh-8rem)]"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
                  />
                  <p className="text-gray-600 dark:text-gray-400">Se încarcă conversația...</p>
                </div>
              </div>
            ) : (
              <ChatWindow className="h-full" />
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}