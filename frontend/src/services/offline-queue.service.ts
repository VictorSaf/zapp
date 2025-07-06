interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  agentId?: string;
  timestamp: Date;
  type: 'message' | 'conversation' | 'update';
  data: any;
  retryCount: number;
}

interface QueuedConversation {
  id: string;
  title: string;
  agentId?: string;
  conversationType: string;
  timestamp: Date;
  type: 'create-conversation';
  retryCount: number;
}

interface QueuedUpdate {
  id: string;
  conversationId: string;
  title?: string;
  isArchived?: boolean;
  timestamp: Date;
  type: 'update-conversation';
  retryCount: number;
}

type QueuedItem = QueuedMessage | QueuedConversation | QueuedUpdate;

export class OfflineQueueService {
  private queue: QueuedItem[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.loadQueueFromStorage();
  }

  /**
   * Add message to offline queue
   */
  queueMessage(conversationId: string, content: string, agentId?: string): string {
    const messageId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      conversationId,
      content,
      agentId,
      timestamp: new Date(),
      type: 'message',
      data: { conversationId, content, agentId },
      retryCount: 0,
    };

    this.queue.push(queuedMessage);
    this.saveQueueToStorage();
    
    console.log(`📦 Queued message for offline sync: ${messageId}`);
    return messageId;
  }

  /**
   * Add conversation to offline queue
   */
  queueConversation(title: string, agentId?: string, conversationType = 'general'): string {
    const conversationId = `offline-conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedConversation: QueuedConversation = {
      id: conversationId,
      title,
      agentId,
      conversationType,
      timestamp: new Date(),
      type: 'create-conversation',
      retryCount: 0,
    };

    this.queue.push(queuedConversation);
    this.saveQueueToStorage();
    
    console.log(`📦 Queued conversation for offline sync: ${conversationId}`);
    return conversationId;
  }

  /**
   * Add conversation update to offline queue
   */
  queueConversationUpdate(conversationId: string, title?: string, isArchived?: boolean): string {
    const updateId = `offline-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedUpdate: QueuedUpdate = {
      id: updateId,
      conversationId,
      title,
      isArchived,
      timestamp: new Date(),
      type: 'update-conversation',
      retryCount: 0,
    };

    this.queue.push(queuedUpdate);
    this.saveQueueToStorage();
    
    console.log(`📦 Queued conversation update for offline sync: ${updateId}`);
    return updateId;
  }

  /**
   * Process queue when online
   */
  async processQueue(webSocketService: any): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing offline queue: ${this.queue.length} items`);

    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        await this.processQueueItem(item, webSocketService);
        
        // Remove from queue on success
        this.removeFromQueue(item.id);
        
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        
        // Increment retry count
        item.retryCount++;
        
        // Remove item if max retries exceeded
        if (item.retryCount >= this.maxRetries) {
          console.warn(`Max retries exceeded for queue item ${item.id}, removing from queue`);
          this.removeFromQueue(item.id);
        }
        
        // Add delay between retries
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    this.saveQueueToStorage();
    this.isProcessing = false;
    
    console.log(`✅ Queue processing completed. Remaining items: ${this.queue.length}`);
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(item: QueuedItem, webSocketService: any): Promise<void> {
    switch (item.type) {
      case 'message':
        const messageItem = item as QueuedMessage;
        webSocketService.sendMessage(
          messageItem.conversationId,
          messageItem.content,
          messageItem.agentId
        );
        break;
        
      case 'create-conversation':
        const conversationItem = item as QueuedConversation;
        webSocketService.createConversation(
          conversationItem.title,
          conversationItem.agentId,
          conversationItem.conversationType
        );
        break;
        
      case 'update-conversation':
        const updateItem = item as QueuedUpdate;
        webSocketService.updateConversation(
          updateItem.conversationId,
          updateItem.title,
          updateItem.isArchived
        );
        break;
        
      default:
        console.warn(`Unknown queue item type: ${(item as any).type}`);
    }
  }

  /**
   * Remove item from queue
   */
  private removeFromQueue(itemId: string): void {
    this.queue = this.queue.filter(item => item.id !== itemId);
  }

  /**
   * Clear all queue items
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueueToStorage();
    console.log('🗑️ Offline queue cleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    itemCount: number;
    isProcessing: boolean;
    oldestItem?: Date;
  } {
    const oldestItem = this.queue.length > 0 
      ? new Date(Math.min(...this.queue.map(item => item.timestamp.getTime())))
      : undefined;

    return {
      itemCount: this.queue.length,
      isProcessing: this.isProcessing,
      oldestItem,
    };
  }

  /**
   * Get pending messages for a conversation
   */
  getPendingMessages(conversationId: string): QueuedMessage[] {
    return this.queue
      .filter(item => item.type === 'message' && (item as QueuedMessage).conversationId === conversationId)
      .map(item => item as QueuedMessage);
  }

  /**
   * Save queue to localStorage
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('zaeus-offline-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('zaeus-offline-queue');
      if (stored) {
        this.queue = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        console.log(`📦 Loaded ${this.queue.length} items from offline queue`);
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }
}

// Singleton instance
export const offlineQueueService = new OfflineQueueService();