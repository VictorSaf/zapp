import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../../types/chat.types';
import { cn } from '../../lib/utils';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {/* Message content */}
        {message.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-pulse flex space-x-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm opacity-70">Agent 00Z gândește...</span>
          </div>
        ) : (
          <div>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            
            {/* Error state */}
            {message.error && (
              <div className="mt-2 text-sm text-destructive">
                ⚠️ {message.error}
              </div>
            )}
          </div>
        )}
        
        {/* Message metadata */}
        <div className={cn(
          'mt-1 text-xs flex items-center gap-2',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          <span>
            {format(new Date(message.timestamp), 'HH:mm', { locale: ro })}
          </span>
          
          {!isUser && message.modelUsed && (
            <>
              <span>•</span>
              <span>{message.provider || 'ollama'}</span>
              {message.processingTimeMs && (
                <>
                  <span>•</span>
                  <span>{(message.processingTimeMs / 1000).toFixed(1)}s</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    scrollToBottom();
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2">
            Salut! Sunt Agent 00Z
          </h3>
          <p className="text-muted-foreground">
            Asistentul tău personal AI pentru trading și educație financiară. 
            Întreabă-mă orice despre piețe, strategii sau analiză tehnică!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </AnimatePresence>
      
      <div ref={messagesEndRef} />
    </div>
  );
};