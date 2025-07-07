import React from 'react'
import { motion } from 'framer-motion'
import { Message } from '../../stores/chat.store'
import { cn } from '../../utils/cn'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface MessageItemProps {
  message: Message
  isFirst?: boolean
  isLast?: boolean
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isFirst = false, 
  isLast = false 
}) => {
  const isUser = message.role === 'user'
  
  const messageVariants = {
    hidden: { 
      opacity: 0, 
      x: isUser ? 20 : -20,
      y: 10 
    },
    visible: { 
      opacity: 1, 
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  }
  
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
        isFirst && "mt-2",
        isLast && "mb-2"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] px-4 py-2 rounded-2xl shadow-sm",
          isUser 
            ? "bg-primary text-white rounded-br-sm" 
            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm",
          message.error && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
        )}
      >
        {/* Agent indicator for assistant messages */}
        {!isUser && message.agent && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium mb-1 opacity-70"
          >
            {getAgentLabel(message.agent)}
          </motion.div>
        )}
        
        {/* Message content */}
        <motion.p 
          className="text-sm whitespace-pre-wrap break-words"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {message.content}
        </motion.p>
        
        {/* Timestamp */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "text-xs mt-1",
            isUser ? "text-white/70" : "text-gray-500 dark:text-gray-400"
          )}
        >
          {format(message.timestamp, 'HH:mm', { locale: ro })}
        </motion.div>
      </div>
    </motion.div>
  )
}

function getAgentLabel(agentId: string): string {
  const labels: Record<string, string> = {
    '00z': '00Z Assistant',
    'mentor': 'Mentor',
    'analyst': 'Analyst',
    'reporter': 'Reporter',
    'strategist': 'Strategist'
  }
  return labels[agentId] || agentId
}