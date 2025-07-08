import React from 'react'
import { motion } from 'framer-motion'
import { AccessibleCard, AccessibleCardContent } from './AccessibleCard'
import { cn } from '../../utils/cn'

interface FeatureToggleProps {
  label: string
  description?: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  icon?: React.ReactNode
  className?: string
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  icon,
  className
}) => {
  return (
    <AccessibleCard
      variant="interactive"
      onClick={() => onChange(!enabled)}
      className={cn("cursor-pointer", className)}
    >
      <AccessibleCardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h4>
              {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          
          <motion.div
            initial={false}
            animate={{ scale: enabled ? 1 : 0.95 }}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              enabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <motion.span
              initial={false}
              animate={{ x: enabled ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow-sm"
              )}
            />
          </motion.div>
        </div>
      </AccessibleCardContent>
    </AccessibleCard>
  )
}