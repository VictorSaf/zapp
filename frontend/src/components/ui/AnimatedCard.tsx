import React from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'
import { animations } from '../../theme/animations'

interface AnimatedCardProps extends MotionProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'hover' | 'interactive' | 'glass'
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'fadeInScale'
  delay?: number
  onClick?: () => void
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  variant = 'default',
  animationType = 'fadeInScale',
  delay = 0,
  onClick,
  ...motionProps
}) => {
  const baseStyles = cn(
    'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300',
    {
      'hover:shadow-md dark:hover:shadow-lg': variant === 'default',
      'hover:shadow-lg hover:-translate-y-1 dark:hover:shadow-xl': variant === 'hover',
      'hover:shadow-xl cursor-pointer dark:hover:shadow-2xl': variant === 'interactive',
      'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-white/20 dark:border-gray-700/20': variant === 'glass'
    },
    className
  )

  const animationVariant = animations[animationType] || animations.fadeInScale

  return (
    <motion.div
      initial={animationVariant.initial}
      animate={animationVariant.animate}
      transition={{ ...animationVariant.transition, delay }}
      whileHover={variant === 'interactive' ? { scale: 1.02, y: -4 } : undefined}
      whileTap={variant === 'interactive' ? { scale: 0.98 } : undefined}
      className={baseStyles}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

// Specialized card components
export const HoverCard: React.FC<Omit<AnimatedCardProps, 'variant'>> = (props) => (
  <AnimatedCard variant="hover" {...props} />
)

export const InteractiveCard: React.FC<Omit<AnimatedCardProps, 'variant'>> = (props) => (
  <AnimatedCard variant="interactive" {...props} />
)

export const GlassCard: React.FC<Omit<AnimatedCardProps, 'variant'>> = (props) => (
  <AnimatedCard variant="glass" {...props} />
)