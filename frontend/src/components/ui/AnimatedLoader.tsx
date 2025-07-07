import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { animations } from '../../theme/animations'

interface AnimatedLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars'
  color?: string
  className?: string
  text?: string
}

export const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className,
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    gray: 'text-gray-500'
  }

  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return (
          <motion.div
            animate={animations.spin.animate}
            transition={animations.spin.transition}
            className={cn(
              'rounded-full border-2 border-current border-t-transparent',
              sizeClasses[size],
              colorClasses[color as keyof typeof colorClasses]
            )}
          />
        )

      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className={cn(
                  'rounded-full bg-current',
                  size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3',
                  colorClasses[color as keyof typeof colorClasses]
                )}
              />
            ))}
          </div>
        )

      case 'pulse':
        return (
          <motion.div
            animate={animations.pulse.animate}
            transition={animations.pulse.transition}
            className={cn(
              'rounded-full bg-current',
              sizeClasses[size],
              colorClasses[color as keyof typeof colorClasses]
            )}
          />
        )

      case 'bars':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scaleY: [1, 2, 1]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
                className={cn(
                  'bg-current rounded-sm',
                  size === 'sm' ? 'w-0.5 h-3' : size === 'md' ? 'w-1 h-5' : 'w-1.5 h-7',
                  colorClasses[color as keyof typeof colorClasses]
                )}
              />
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {renderLoader()}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-sm text-gray-600 dark:text-gray-300"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

// Full page loader
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Se încarcă...' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-50 flex items-center justify-center"
  >
    <AnimatedLoader size="lg" variant="dots" text={text} />
  </motion.div>
)

// Skeleton loader
export const SkeletonLoader: React.FC<{ className?: string; count?: number }> = ({
  className,
  count = 1
}) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className={cn(
          'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
          'rounded-md',
          className || 'h-4 w-full'
        )}
        style={{
          backgroundSize: '200% 100%'
        }}
        animate={animations.skeleton.animate}
        transition={animations.skeleton.transition}
      />
    ))}
  </div>
)