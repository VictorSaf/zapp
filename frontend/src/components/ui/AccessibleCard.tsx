import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface AccessibleCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'interactive' | 'outline' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  contrast?: 'normal' | 'high'
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  className,
  onClick,
  variant = 'default',
  padding = 'md',
  contrast = 'normal',
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) => {
  // Base classes with excellent contrast ratios
  const baseClasses = "rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  
  // Variant classes optimized for accessibility
  const variantClasses = {
    default: cn(
      // Light mode: White background (rgb(255,255,255)) with dark text
      "bg-white border border-gray-300",
      // Dark mode: Dark gray background (rgb(31,41,55)) with light text  
      "dark:bg-gray-800 dark:border-gray-600",
      // Shadow for depth
      "shadow-sm hover:shadow-md"
    ),
    
    interactive: cn(
      "bg-white border border-gray-300 cursor-pointer",
      "dark:bg-gray-800 dark:border-gray-600",
      "shadow-sm hover:shadow-lg hover:border-gray-400 dark:hover:border-gray-500",
      "hover:scale-[1.02] active:scale-[0.98]",
      // Enhanced focus states
      "focus-visible:shadow-lg focus-visible:border-primary dark:focus-visible:border-primary"
    ),
    
    outline: cn(
      "border-2 border-gray-400 dark:border-gray-500",
      "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800",
      "hover:border-gray-500 dark:hover:border-gray-400"
    ),
    
    elevated: cn(
      "bg-white border border-gray-200",
      "dark:bg-gray-750 dark:border-gray-600", // Custom gray-750 for better contrast
      "shadow-lg hover:shadow-xl",
      "transform hover:-translate-y-1"
    )
  }

  // High contrast mode overrides
  const highContrastClasses = contrast === 'high' ? cn(
    "border-gray-900 dark:border-gray-100",
    "bg-white dark:bg-gray-900",
    "text-gray-900 dark:text-gray-50"
  ) : ''

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
    onClick,
    role: role || 'button',
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    }
  } : {
    role: role || 'article'
  }

  return (
    <Component
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        highContrastClasses,
        className
      )}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...componentProps}
      {...props}
    >
      {children}
    </Component>
  )
}

// Accessible Card Header with improved contrast
export const AccessibleCardHeader: React.FC<{ 
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
  contrast?: 'normal' | 'high'
}> = ({ children, className, icon, contrast = 'normal' }) => {
  const textClasses = contrast === 'high' 
    ? 'text-gray-900 dark:text-gray-50'
    : 'text-gray-800 dark:text-gray-100' // Improved contrast

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
      <div className={cn("flex-1", textClasses)}>{children}</div>
    </div>
  )
}

// Accessible Card Title with semantic heading
export const AccessibleCardTitle: React.FC<{ 
  children: React.ReactNode
  className?: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
  contrast?: 'normal' | 'high'
}> = ({ children, className, level = 3, contrast = 'normal' }) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements
  
  const headingClasses = cn(
    "font-semibold",
    // Improved contrast ratios
    contrast === 'high' 
      ? 'text-gray-900 dark:text-gray-50'
      : 'text-gray-900 dark:text-gray-100',
    className
  )

  return React.createElement(HeadingTag, { className: headingClasses }, children)
}

// Accessible Card Badge with high contrast
export const AccessibleCardBadge: React.FC<{ 
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  className?: string
  contrast?: 'normal' | 'high'
}> = ({ children, variant = 'default', className, contrast = 'normal' }) => {
  const baseClasses = "inline-block px-2 py-0.5 text-xs rounded-full font-medium"
  
  const variantClasses = {
    default: contrast === 'high'
      ? 'bg-gray-900 text-gray-50 dark:bg-gray-50 dark:text-gray-900'
      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
    
    primary: contrast === 'high'
      ? 'bg-blue-900 text-blue-50 dark:bg-blue-100 dark:text-blue-900'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    
    success: contrast === 'high'
      ? 'bg-green-900 text-green-50 dark:bg-green-100 dark:text-green-900'
      : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    
    warning: contrast === 'high'
      ? 'bg-yellow-900 text-yellow-50 dark:bg-yellow-100 dark:text-yellow-900'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    
    error: contrast === 'high'
      ? 'bg-red-900 text-red-50 dark:bg-red-100 dark:text-red-900'
      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
  }

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  )
}

// Accessible Card Description with proper contrast
export const AccessibleCardDescription: React.FC<{ 
  children: React.ReactNode
  className?: string
  clamp?: boolean
  contrast?: 'normal' | 'high'
}> = ({ children, className, clamp = false, contrast = 'normal' }) => {
  const textClasses = cn(
    "text-sm",
    contrast === 'high'
      ? 'text-gray-800 dark:text-gray-200'
      : 'text-gray-700 dark:text-gray-300', // Improved contrast
    clamp && "line-clamp-2",
    className
  )

  return (
    <p className={textClasses}>
      {children}
    </p>
  )
}

// Accessible Card Footer with high contrast
export const AccessibleCardFooter: React.FC<{ 
  children: React.ReactNode
  className?: string
  contrast?: 'normal' | 'high'
}> = ({ children, className, contrast = 'normal' }) => {
  const textClasses = cn(
    "flex items-center justify-between text-xs",
    contrast === 'high'
      ? 'text-gray-700 dark:text-gray-300'
      : 'text-gray-600 dark:text-gray-400', // Slightly improved
    className
  )

  return (
    <div className={textClasses}>
      {children}
    </div>
  )
}

// Accessible Card Content wrapper
export const AccessibleCardContent: React.FC<{ 
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div className={cn("space-y-3", className)}>
    {children}
  </div>
)

// Preview Card specifically for ComponentPreview with fixed contrast issues
export const PreviewCard: React.FC<{ 
  title: string
  children: React.ReactNode
  className?: string
}> = ({ title, children, className }) => {
  return (
    <AccessibleCard 
      variant="elevated" 
      contrast="normal" 
      className={className}
      aria-labelledby="preview-title"
    >
      <AccessibleCardContent>
        <AccessibleCardTitle 
          level={4} 
          id="preview-title"
          className="mb-4"
          contrast="normal"
        >
          {title}
        </AccessibleCardTitle>
        <div className="relative">
          {children}
        </div>
      </AccessibleCardContent>
    </AccessibleCard>
  )
}