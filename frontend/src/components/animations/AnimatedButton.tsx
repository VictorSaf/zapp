import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  children, 
  className,
  variant = 'primary',
  ...props 
}) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}