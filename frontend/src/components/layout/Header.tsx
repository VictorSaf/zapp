import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/Button'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { AnimatedTooltip } from '../ui/AnimatedTooltip'
import { ScrollProgress } from '../ui/ScrollProgress'
import { UserProfileModal } from '../user/UserProfileModal'
import { config } from '../../config/env'
import { cn } from '../../utils/cn'

interface HeaderProps {
  title?: string
  backTo?: string
  backLabel?: string
  showThemeSwitcher?: boolean
  showAdminButton?: boolean
  showUserInfo?: boolean
  showLogout?: boolean
  children?: React.ReactNode
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  title = config.APP_NAME,
  backTo,
  backLabel = 'Înapoi',
  showThemeSwitcher = true,
  showAdminButton = true,
  showUserInfo = true,
  showLogout = true,
  children,
  className
}) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <ScrollProgress />
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          "bg-white dark:bg-gray-800 border-b dark:border-gray-700",
          isScrolled ? [
            "shadow-md backdrop-blur-lg",
            "bg-white/90 dark:bg-gray-800/90",
            "border-gray-200/50 dark:border-gray-700/50"
          ] : [
            "shadow-sm",
            "bg-white/95 dark:bg-gray-800/95"
          ],
          className
        )}
      >
        <div className={cn(
          "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300",
          isScrolled ? "py-3" : "py-4"
        )}>
          {/* Back Button - Absolute Left */}
          {backTo && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(backTo)}
              className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">{backLabel}</span>
            </motion.button>
          )}
          
          {/* Center/Left - ZAEUS and Page Title */}
          <div className={cn(
            "flex items-center space-x-2",
            backTo && "ml-32"
          )}>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {config.APP_NAME}
            </h1>
            <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
              {title !== config.APP_NAME ? title : ''}
            </span>
            {children}
          </div>

            {/* Right Side Actions - Absolute Right */}
            <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 flex items-center space-x-3">
              {showUserInfo && user && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.first_name}
                  </span>
                  {user.is_admin && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary rounded-full">
                      Admin
                    </span>
                  )}
                </motion.button>
              )}
            
              {showThemeSwitcher && (
                <ThemeSwitcher variant="dropdown" showLabel={false} />
              )}

              {showAdminButton && user?.is_admin && (
                <AnimatedTooltip content="Setări Admin">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/settings')}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-200 group"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </motion.button>
                </AnimatedTooltip>
              )}

              {showLogout && (
                <AnimatedTooltip content="Deconectare">
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-all duration-200 group"
                  >
                    <svg 
                      className="w-5 h-5 text-red-600 dark:text-red-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" 
                      />
                    </svg>
                  </motion.button>
                </AnimatedTooltip>
              )}
            </div>
        </div>
      </motion.header>
      
      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </>
  )
}