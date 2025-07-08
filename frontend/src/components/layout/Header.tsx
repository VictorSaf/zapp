import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/Button'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { AnimatedTooltip } from '../ui/AnimatedTooltip'
import { ScrollProgress } from '../ui/ScrollProgress'
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
          "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300",
          isScrolled ? "py-3" : "py-4"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {backTo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(backTo)}
                  className="flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>{backLabel}</span>
                </Button>
              )}
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                {title}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {children}
              
              {showThemeSwitcher && (
                <ThemeSwitcher variant="buttons" showLabel={false} />
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

              {showUserInfo && user && (
                <div className="text-right mr-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bine ai venit,</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center justify-end">
                    {user.first_name} {user.last_name}
                    {user.is_admin && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary rounded-full">
                        Admin
                      </span>
                    )}
                  </p>
                </div>
              )}

              {showLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  Deconectare
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.header>
    </>
  )
}