import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'
import { animations } from '../../theme/animations'

interface AnimatedTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 0.5,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true)
    }, delay * 1000)
    setShowTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (showTimeout) {
      clearTimeout(showTimeout)
    }
    setIsVisible(false)
  }

  const positionClasses = {
    top: '-top-2 left-1/2 -translate-x-1/2 -translate-y-full',
    bottom: '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full',
    left: 'top-1/2 -left-2 -translate-y-1/2 -translate-x-full',
    right: 'top-1/2 -right-2 -translate-y-1/2 translate-x-full'
  }

  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full'
  }

  const arrowStyles = {
    top: { borderTop: '6px solid hsl(215, 28%, 17%)' },
    bottom: { borderBottom: '6px solid hsl(215, 28%, 17%)' },
    left: { borderLeft: '6px solid hsl(215, 28%, 17%)' },
    right: { borderRight: '6px solid hsl(215, 28%, 17%)' }
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={animations.tooltip.initial}
            animate={animations.tooltip.animate}
            exit={animations.tooltip.exit}
            transition={animations.tooltip.transition}
            className={cn(
              "absolute z-50 px-3 py-2",
              "bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-md",
              "whitespace-nowrap shadow-lg",
              positionClasses[position],
              className
            )}
          >
            {content}
            
            {/* Arrow */}
            <div
              className={cn(
                "absolute w-0 h-0",
                "border-solid border-transparent",
                arrowClasses[position]
              )}
              style={{
                borderWidth: '6px',
                ...arrowStyles[position]
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Quick tooltip component with icon
export const IconTooltip: React.FC<{
  content: string
  className?: string
}> = ({ content, className }) => (
  <AnimatedTooltip content={content}>
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={cn(
        "inline-flex items-center justify-center",
        "w-4 h-4 rounded-full bg-gray-200 text-gray-600",
        "cursor-help text-xs font-semibold",
        className
      )}
    >
      ?
    </motion.div>
  </AnimatedTooltip>
)