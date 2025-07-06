import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatHeader } from './ChatHeader';
import { TypingIndicator } from './TypingIndicator';
import { ConnectionStatus } from './ConnectionStatus';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const {
    messages,
    isLoading,
    error,
    activeConversationId,
    activeAgent,
    sendMessage,
    createConversation,
    clearError,
    connectWebSocket,
    connectionStatus,
  } = useChatStore();

  // Create initial conversation if none exists
  useEffect(() => {
    if (!activeConversationId) {
      createConversation();
    }
  }, [activeConversationId, createConversation]);

  // Connect to WebSocket on mount
  useEffect(() => {
    if (connectionStatus.status === 'disconnected') {
      connectWebSocket();
    }
  }, [connectWebSocket, connectionStatus.status]);

  // Filter messages for active conversation
  const conversationMessages = messages.filter(
    msg => msg.conversationId === activeConversationId
  );

  const handleSendMessage = async (content: string) => {
    await sendMessage({ content });
  };

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Sidebar */}
      <ConversationSidebar className="w-80 border-r" />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader />
        
        {/* Connection Status */}
        <div className="px-4 py-2">
          <ConnectionStatus />
        </div>
        
        {/* Messages */}
        <MessageList 
          messages={conversationMessages} 
          isLoading={isLoading} 
        />
        
        {/* Typing Indicator */}
        {activeConversationId && (
          <TypingIndicator conversationId={activeConversationId} />
        )}
        
        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mb-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center justify-between"
          >
            <span className="text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-sm underline hover:no-underline"
            >
              Închide
            </button>
          </motion.div>
        )}
        
        {/* Input */}
        <MessageInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={`Întreabă-l pe ${activeAgent?.displayName || 'Agent 00Z'}...`}
          conversationId={activeConversationId || undefined}
        />
      </div>
    </div>
  );
};