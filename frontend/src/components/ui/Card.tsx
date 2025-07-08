import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'interactive' | 'outline'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  variant = 'default',
  padding = 'md'
}) => {
  const baseClasses = "bg-white dark:bg-gray-800 rounded-lg transition-all duration-200"
  
  const variantClasses = {
    default: "border border-gray-200 dark:border-gray-700 shadow-sm",
    interactive: "border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer",
    outline: "border-2 border-gray-300 dark:border-gray-600"
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const Component = onClick ? motion.div : 'div'
  const componentProps = onClick ? {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring", stiffness: 400, damping: 17 },
    onClick
  } : {}

  return (
    <Component
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
      {...componentProps}
    >
      {children}
    </Component>
  )
}

// Card Header component
export const CardHeader: React.FC<{ 
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}> = ({ children, className, icon }) => (
  <div className={cn("flex items-center space-x-3", className)}>
    {icon && <span className="text-2xl">{icon}</span>}
    <div className="flex-1">{children}</div>
  </div>
)

// Card Title component
export const CardTitle: React.FC<{ 
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <h3 className={cn("font-semibold text-gray-900 dark:text-white", className)}>
    {children}
  </h3>
)

// Card Badge component
export const CardBadge: React.FC<{ 
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  className?: string
}> = ({ children, variant = 'default', className }) => {
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
  }

  return (
    <span className={cn(
      "inline-block px-2 py-0.5 text-xs rounded-full",
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}

// Card Description component
export const CardDescription: React.FC<{ 
  children: React.ReactNode
  className?: string
  clamp?: boolean
}> = ({ children, className, clamp = false }) => (
  <p className={cn(
    "text-sm text-gray-600 dark:text-gray-300",
    clamp && "line-clamp-2",
    className
  )}>
    {children}
  </p>
)

// Card Footer component
export const CardFooter: React.FC<{ 
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div className={cn(
    "flex items-center justify-between text-xs text-gray-500 dark:text-gray-400",
    className
  )}>
    {children}
  </div>
)

// Card Content component for generic content
export const CardContent: React.FC<{ 
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div className={cn("space-y-3", className)}>
    {children}
  </div>
)