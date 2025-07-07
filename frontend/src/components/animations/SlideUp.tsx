import React from 'react'
import { motion } from 'framer-motion'

interface SlideUpProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export const SlideUp: React.FC<SlideUpProps> = ({ 
  children, 
  delay = 0, 
  duration = 0.5,
  className 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.1, 0.25, 1] // Custom easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}