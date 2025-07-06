import React, { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useChatStore } from '../../stores/chatStore';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  conversationId?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Scrie un mesaj...",
  className,
  conversationId
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  
  const { startTyping, stopTyping } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      handleStopTyping();
    };
  }, []);

  const handleTyping = () => {
    if (!conversationId) return;
    
    if (!isTyping) {
      setIsTyping(true);
      startTyping(conversationId);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 2 seconds of no activity
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      stopTyping(conversationId);
    }, 2000);
  };

  const handleStopTyping = () => {
    if (isTyping && conversationId) {
      setIsTyping(false);
      stopTyping(conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isLoading) {
      handleStopTyping(); // Stop typing before sending
      onSendMessage(trimmedMessage);
      setMessage('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('p-4 border-t bg-background', className)}>
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleStopTyping}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'flex-1 resize-none rounded-2xl border bg-muted px-4 py-3',
              'min-h-[52px] max-h-[200px]',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'placeholder:text-muted-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
            rows={1}
          />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            className={cn(
              'p-3 rounded-full bg-primary text-primary-foreground',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </motion.button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          <span>Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă</span>
        </div>
      </div>
    </div>
  );
};