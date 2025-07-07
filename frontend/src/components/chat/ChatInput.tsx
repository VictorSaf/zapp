import React, { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useChatStore } from '../../stores/chat.store'
import { cn } from '../../utils/cn'
import { socketService } from '../../services/socket.service'

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, isTyping, activeConversation } = useChatStore()
  
  const handleSend = () => {
    if (message.trim() && !isTyping) {
      sendMessage(message.trim())
      setMessage('')
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    
    // Emit typing status
    if (activeConversation && socketService.isConnected()) {
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
      
      // Emit typing true
      socketService.emitTypingStatus(activeConversation.id, true)
      
      // Set timeout to stop typing after 2 seconds
      const timeout = setTimeout(() => {
        if (activeConversation) {
          socketService.emitTypingStatus(activeConversation.id, false)
        }
      }, 2000)
      
      setTypingTimeout(timeout)
    }
  }
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
      if (activeConversation && socketService.isConnected()) {
        socketService.emitTypingStatus(activeConversation.id, false)
      }
    }
  }, [typingTimeout, activeConversation])
  
  return (
    <motion.div 
      className="p-4 border-t dark:border-gray-700"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className={cn(
        "flex items-end space-x-2 rounded-lg border transition-all duration-200",
        isFocused 
          ? "border-primary shadow-md dark:border-primary" 
          : "border-gray-300 dark:border-gray-600"
      )}>
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Scrie un mesaj..."
          disabled={isTyping}
          rows={1}
          className={cn(
            "flex-1 px-4 py-3 bg-transparent resize-none outline-none",
            "text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          )}
          style={{ maxHeight: '120px' }}
        />
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!message.trim() || isTyping}
          className={cn(
            "mb-2 mr-2 p-2 rounded-lg transition-all duration-200",
            message.trim() && !isTyping
              ? "bg-primary hover:bg-primary-dark text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          )}
        >
          <svg 
            className="w-5 h-5 transform rotate-90" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        </motion.button>
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
      >
        <span>Enter pentru a trimite, Shift+Enter pentru linie nouă</span>
        {message.length > 0 && (
          <span className={cn(
            message.length > 1000 ? "text-red-500" : ""
          )}>
            {message.length}/1000
          </span>
        )}
      </motion.div>
    </motion.div>
  )
}