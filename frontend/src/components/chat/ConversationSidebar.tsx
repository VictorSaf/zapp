import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';

interface ConversationSidebarProps {
  className?: string;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ className }) => {
  const {
    conversations,
    activeConversationId,
    createConversation,
    selectConversation,
    deleteConversation,
  } = useChatStore();

  // Group conversations by date
  const groupedConversations = conversations.reduce((acc, conv) => {
    const date = format(new Date(conv.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(conv);
    return acc;
  }, {} as Record<string, typeof conversations>);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Astăzi';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ieri';
    } else {
      return format(date, 'd MMMM', { locale: ro });
    }
  };

  return (
    <div className={cn('flex flex-col bg-muted/30', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => createConversation()}
          className="w-full flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Conversație nouă</span>
        </motion.button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {Object.entries(groupedConversations)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, convs]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Date Group Header */}
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {getDateLabel(date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Conversations in this date group */}
                <div className="space-y-1">
                  {convs.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      whileHover={{ x: 2 }}
                      className={cn(
                        'group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
                        activeConversationId === conversation.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => selectConversation(conversation.id)}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(conversation.updatedAt), 'HH:mm')}
                        </p>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>

        {conversations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Nu ai conversații încă.
            </p>
            <p className="text-sm text-muted-foreground">
              Începe una nouă!
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Ollama conectat</span>
        </div>
      </div>
    </div>
  );
};