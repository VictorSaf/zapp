import React from 'react'
import { motion } from 'framer-motion'

interface StaggerChildrenProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export const StaggerChildren: React.FC<StaggerChildrenProps> = ({ 
  children, 
  staggerDelay = 0.1,
  className 
}) => {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}