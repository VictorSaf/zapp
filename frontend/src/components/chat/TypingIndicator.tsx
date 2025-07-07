import React from 'react'
import { motion } from 'framer-motion'

export const TypingIndicator: React.FC = () => {
  const dotVariants = {
    start: { y: 0 },
    bounce: { 
      y: -8,
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut"
      }
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center space-x-2 p-4"
    >
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center space-x-2">
        <motion.div
          className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
          variants={dotVariants}
          initial="start"
          animate="bounce"
          transition={{ delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
          variants={dotVariants}
          initial="start"
          animate="bounce"
          transition={{ delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
          variants={dotVariants}
          initial="start"
          animate="bounce"
          transition={{ delay: 0.4 }}
        />
      </div>
    </motion.div>
  )
}