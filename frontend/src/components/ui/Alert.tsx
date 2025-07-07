import React from 'react'
import { cn } from '../../utils/cn'

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  className?: string
  children: React.ReactNode
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  className,
  children,
}) => {
  const variants = {
    default: 'bg-background text-foreground border-border',
    destructive: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-400 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-400 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  }

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  )
}