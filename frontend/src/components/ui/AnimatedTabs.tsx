import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
  icon?: React.ReactNode
}

interface AnimatedTabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
  variant?: 'default' | 'pills' | 'underline'
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className,
  variant = 'default'
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  const tabVariants = {
    default: {
      inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
      active: 'text-gray-900 dark:text-white',
      indicator: 'bg-primary h-0.5 bottom-0'
    },
    pills: {
      inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
      active: 'text-white',
      indicator: 'bg-primary rounded-full h-full'
    },
    underline: {
      inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent',
      active: 'text-primary dark:text-primary border-b-2 border-primary',
      indicator: ''
    }
  }

  const styles = tabVariants[variant]

  return (
    <div className={cn('w-full', className)}>
      {/* Tab List */}
      <div className="relative">
        <div className={cn(
          'flex',
          variant === 'pills' ? 'space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg' : 'space-x-6 border-b dark:border-gray-700'
        )}>
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'relative px-4 py-2 font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 rounded',
                activeTab === tab.id ? styles.active : styles.inactive,
                variant === 'pills' && 'flex-1'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center space-x-2">
                {tab.icon && <span>{tab.icon}</span>}
                <span>{tab.label}</span>
              </span>

              {/* Active indicator for pills variant */}
              {variant === 'pills' && activeTab === tab.id && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-0 bg-primary rounded-md"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}

          {/* Active indicator for default variant */}
          {variant === 'default' && (
            <motion.div
              layoutId="activeTab"
              className={cn('absolute', styles.indicator)}
              style={{
                width: `${100 / tabs.length}%`,
                left: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {tabs.find(tab => tab.id === activeTab)?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Tab Panel component for better organization
export const TabPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <div className={cn('focus:outline-none', className)}>
    {children}
  </div>
)