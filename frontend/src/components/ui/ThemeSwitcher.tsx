import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeSwitcherProps {
  className?: string
  showLabel?: boolean
  variant?: 'dropdown' | 'toggle' | 'buttons'
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className,
  showLabel = true,
  variant = 'dropdown'
}) => {
  const [theme, setTheme] = useState<Theme>('light')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('auto')
      applyTheme('dark')
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
    } else {
      root.classList.toggle('dark', newTheme === 'dark')
    }
    
    localStorage.setItem('theme', newTheme)
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    applyTheme(newTheme)
    setIsOpen(false)
  }

  const themeOptions = [
    { value: 'light', label: 'Luminos', icon: '☀️' },
    { value: 'dark', label: 'Întunecat', icon: '🌙' },
    { value: 'auto', label: 'Automat', icon: '🖥️' }
  ]

  const currentTheme = themeOptions.find(opt => opt.value === theme)

  if (variant === 'toggle') {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
        className={cn(
          'relative w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full p-1',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          className
        )}
      >
        <motion.div
          animate={{ x: theme === 'dark' ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-xs"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </motion.div>
      </motion.button>
    )
  }

  if (variant === 'buttons') {
    return (
      <div className={cn('flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg', className)}>
        {themeOptions.map((option) => (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleThemeChange(option.value as Theme)}
            className={cn(
              'relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              theme === option.value
                ? 'text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            <span className="relative z-10 flex items-center space-x-1">
              <span>{option.icon}</span>
              {showLabel && <span>{option.label}</span>}
            </span>
            {theme === option.value && (
              <motion.div
                layoutId="activeTheme"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className={cn('relative', className)}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-lg',
          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      >
        <span className="text-lg">{currentTheme?.icon}</span>
        {showLabel && <span className="text-sm font-medium">{currentTheme?.label}</span>}
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute right-0 mt-2 w-48 py-2',
              'bg-white dark:bg-gray-800 rounded-lg shadow-xl',
              'border border-gray-200 dark:border-gray-700',
              'z-50'
            )}
          >
            {themeOptions.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                onClick={() => handleThemeChange(option.value as Theme)}
                className={cn(
                  'w-full px-4 py-2 text-left flex items-center space-x-3',
                  'text-gray-700 dark:text-gray-300',
                  'hover:text-gray-900 dark:hover:text-gray-100',
                  theme === option.value && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <span className="text-lg">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
                {theme === option.value && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 ml-auto text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}