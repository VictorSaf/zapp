import React from 'react'
import { Card, CardContent } from './Card'
import { cn } from '../../utils/cn'

interface DetailCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export const DetailCard: React.FC<DetailCardProps> = ({ title, children, className }) => {
  return (
    <Card variant="default" padding="md" className={className}>
      <CardContent>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  )
}

// Tag List Component for items like pages, props, variants
interface TagListProps {
  items: string[]
  variant?: 'default' | 'primary' | 'code' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onTagClick?: (item: string) => void
  className?: string
}

export const TagList: React.FC<TagListProps> = ({ 
  items, 
  variant = 'default', 
  size = 'md',
  interactive = false,
  onTagClick,
  className 
}) => {
  // Professional color schemes with WCAG AA compliance (4.5:1 contrast ratio)
  const variantClasses = {
    default: {
      base: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100',
      hover: 'hover:bg-gray-200 dark:hover:bg-gray-600',
      border: 'border border-gray-200 dark:border-gray-600'
    },
    primary: {
      base: 'bg-primary/10 dark:bg-primary/20 text-primary-700 dark:text-primary-300',
      hover: 'hover:bg-primary/20 dark:hover:bg-primary/30',
      border: 'border border-primary/20 dark:border-primary/30'
    },
    code: {
      base: 'bg-gray-900 dark:bg-gray-800 text-gray-100 dark:text-gray-100 font-mono',
      hover: 'hover:bg-gray-800 dark:hover:bg-gray-700',
      border: 'border border-gray-700 dark:border-gray-600'
    },
    success: {
      base: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      border: 'border border-green-200 dark:border-green-800'
    },
    warning: {
      base: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
      hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      border: 'border border-yellow-200 dark:border-yellow-800'
    },
    error: {
      base: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
      border: 'border border-red-200 dark:border-red-800'
    },
    info: {
      base: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      border: 'border border-blue-200 dark:border-blue-800'
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  const currentVariant = variantClasses[variant]
  const isClickable = interactive || onTagClick

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item, index) => {
        const Tag = isClickable ? 'button' : 'span'
        
        return (
          <Tag
            key={`${item}-${index}`}
            onClick={isClickable ? () => onTagClick?.(item) : undefined}
            className={cn(
              // Base styles
              "inline-flex items-center font-medium transition-all duration-200",
              variant === 'code' ? 'rounded' : 'rounded-full',
              
              // Size classes
              sizeClasses[size],
              
              // Variant classes
              currentVariant.base,
              currentVariant.border,
              
              // Interactive states
              isClickable && [
                currentVariant.hover,
                "cursor-pointer transform active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
                "dark:focus:ring-offset-gray-800"
              ]
            )}
          >
            {item}
          </Tag>
        )
      })}
    </div>
  )
}

// Info Grid for displaying key-value pairs
interface InfoItem {
  label: string
  value: string | number
  valueClassName?: string
}

interface InfoGridProps {
  items: InfoItem[]
  className?: string
}

export const InfoGrid: React.FC<InfoGridProps> = ({ items, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
          <span className={cn("font-semibold text-gray-900 dark:text-gray-100", item.valueClassName)}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// Feature List Component
interface FeatureListProps {
  features: string[]
  className?: string
  animate?: boolean
}

export const FeatureList: React.FC<FeatureListProps> = ({ features, className, animate = false }) => {
  if (animate) {
    // Import StaggerChildren dynamically for animated version
    try {
      const { StaggerChildren } = require('../animations/StaggerChildren')
      
      return (
        <StaggerChildren className={cn("space-y-2", className)}>
          {features.map((feature, index) => (
            <motion.li
              key={index}
              className="flex items-start space-x-2 list-none"
            >
              <span className="text-primary mt-0.5">•</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {feature}
              </span>
            </motion.li>
          ))}
        </StaggerChildren>
      )
    } catch (error) {
      // Fallback to non-animated version if StaggerChildren is not available
      console.warn('StaggerChildren not available, using non-animated version')
    }
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {features.map((feature, index) => (
        <li
          key={index}
          className="flex items-start space-x-2 list-none"
        >
          <span className="text-primary mt-0.5">•</span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {feature}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Section Card - for larger sections with optional icon
interface SectionCardProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export const SectionCard: React.FC<SectionCardProps> = ({ 
  title, 
  icon, 
  children, 
  className,
  actions 
}) => {
  return (
    <Card variant="default" padding="md" className={className}>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {actions && <div>{actions}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}