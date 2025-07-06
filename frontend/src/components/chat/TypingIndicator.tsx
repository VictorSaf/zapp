import React from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';

interface TypingIndicatorProps {
  conversationId: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ conversationId }) => {
  const { typingUsers, typingAgents } = useChatStore();
  
  const currentTypingUsers = typingUsers.filter(u => u.conversationId === conversationId && u.isTyping);
  const currentTypingAgents = typingAgents.filter(a => a.conversationId === conversationId && a.isTyping);
  
  const hasTypingActivity = currentTypingUsers.length > 0 || currentTypingAgents.length > 0;
  
  if (!hasTypingActivity) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-500"
    >
      {/* Agent Typing Indicator */}
      {currentTypingAgents.map(agent => (
        <motion.div
          key={`agent-${agent.agentId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-600 font-medium">Agent 00Z</span>
            <span>scrie...</span>
          </div>
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 bg-blue-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      ))}
      
      {/* User Typing Indicator */}
      {currentTypingUsers.map(user => (
        <motion.div
          key={`user-${user.userId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-600 font-medium">Utilizator</span>
            <span>scrie...</span>
          </div>
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 bg-green-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default TypingIndicator;