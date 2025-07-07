import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Message } from '../../stores/chat.store'
import { MessageItem } from './MessageItem'

interface MessageListProps {
  messages: Message[]
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <AnimatePresence initial={false}>
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isFirst={index === 0}
          isLast={index === messages.length - 1}
        />
      ))}
    </AnimatePresence>
  )
}