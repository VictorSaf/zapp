import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Settings, Info } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';

interface ChatHeaderProps {
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ className }) => {
  const { activeAgent, conversations, activeConversationId } = useChatStore();
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <div className={cn('border-b bg-background', className)}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* Agent Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Bot className="w-6 h-6 text-primary" />
          </motion.div>
          
          {/* Agent Info */}
          <div>
            <h2 className="font-semibold">
              {activeAgent?.displayName || 'Agent 00Z'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeAgent?.description || 'Asistent AI pentru trading'}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Informații agent"
          >
            <Info className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Setări conversație"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
      
      {/* Conversation Title */}
      {activeConversation && (
        <div className="px-4 pb-3">
          <p className="text-sm text-muted-foreground">
            {activeConversation.title}
          </p>
        </div>
      )}
    </div>
  );
};