import React from 'react';
import { ChatInterface } from '../components/chat';
import ConnectionStatus from '../components/ui/ConnectionStatus';

const Chat: React.FC = () => {
  return (
    <div className="h-screen flex flex-col">
      <ChatInterface className="flex-1" />
      <ConnectionStatus 
        isVisible={true} 
        showDetails={true} 
        position="top-right" 
      />
    </div>
  );
};

export default Chat;