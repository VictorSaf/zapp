import React from 'react'
import { motion } from 'framer-motion'
import { AccessibleCard, AccessibleCardContent } from './AccessibleCard'
import { cn } from '../../utils/cn'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: React.ReactNode
  description?: string
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  description,
  className,
  variant = 'default'
}) => {
  const variantStyles = {
    default: '',
    primary: 'border-primary/20 bg-primary/5',
    success: 'border-green-500/20 bg-green-50 dark:bg-green-900/10',
    warning: 'border-yellow-500/20 bg-yellow-50 dark:bg-yellow-900/10',
    error: 'border-red-500/20 bg-red-50 dark:bg-red-900/10'
  }

  const variantIconStyles = {
    default: 'bg-gray-100 dark:bg-gray-800',
    primary: 'bg-primary/10',
    success: 'bg-green-100 dark:bg-green-900/30',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30',
    error: 'bg-red-100 dark:bg-red-900/30'
  }

  const getChangeIcon = () => {
    if (!change) return null
    
    switch (change.type) {
      case 'increase':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l10-10M17 7v10M7 7h10" />
          </svg>
        )
      case 'decrease':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17l-10-10M7 17V7l10 10" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        )
    }
  }

  const getChangeColor = () => {
    if (!change) return ''
    switch (change.type) {
      case 'increase':
        return 'text-green-600 dark:text-green-400'
      case 'decrease':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <AccessibleCard
      variant="default"
      className={cn(variantStyles[variant], className)}
    >
      <AccessibleCardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-gray-900 dark:text-white mt-1"
            >
              {value}
            </motion.p>
            
            {change && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={cn("flex items-center gap-1 mt-2", getChangeColor())}
              >
                {getChangeIcon()}
                <span className="text-sm font-medium">
                  {change.value > 0 ? '+' : ''}{change.value}%
                </span>
              </motion.div>
            )}
            
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {description}
              </p>
            )}
          </div>
          
          {icon && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                variantIconStyles[variant]
              )}
            >
              {icon}
            </motion.div>
          )}
        </div>
      </AccessibleCardContent>
    </AccessibleCard>
  )
}