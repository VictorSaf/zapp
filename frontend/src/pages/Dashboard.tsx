import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth.store'
import { Button } from '../components/ui/Button'
import { config } from '../config/env'
import { PageTransition, FadeIn, SlideUp, StaggerChildren } from '../components/animations'
import { AnimatedCard, InteractiveCard } from '../components/ui/AnimatedCard'
import { AnimatedModal, ModalFooter } from '../components/ui/AnimatedModal'
import { AnimatedTooltip, IconTooltip } from '../components/ui/AnimatedTooltip'
import { AnimatedTabs, TabPanel } from '../components/ui/AnimatedTabs'
import { AnimatedLoader, SkeletonLoader } from '../components/ui/AnimatedLoader'
import { Header } from '../components/layout'
import { cn } from '../utils/cn'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loadUser } = useAuthStore()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [isLoadingActivity, setIsLoadingActivity] = useState(true)

  useEffect(() => {
    // Load user data if we have a token but no user data
    if (!user && isAuthenticated) {
      loadUser()
    }
    
    // Force reload user data if is_admin is missing
    if (user && user.is_admin === undefined && isAuthenticated) {
      console.log('is_admin missing, reloading user data...')
      loadUser()
    }
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login')
    }

    // Debug user data
    console.log('Dashboard user data:', user)
    console.log('Is admin?', user?.is_admin)

    // Simulate loading activity
    const timer = setTimeout(() => {
      setIsLoadingActivity(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [user, isAuthenticated, navigate, loadUser])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedLoader size="lg" variant="dots" text="Se încarcă..." />
      </div>
    )
  }

  const dashboardTabs = [
    {
      id: 'overview',
      label: 'Prezentare Generală',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: (
        <TabPanel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatedCard animationType="slideUp" delay={0.1}>
              <div className="p-4">
                <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Conversații</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              </div>
            </AnimatedCard>
            <AnimatedCard animationType="slideUp" delay={0.2}>
              <div className="p-4">
                <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ore de Învățare</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              </div>
            </AnimatedCard>
            <AnimatedCard animationType="slideUp" delay={0.3}>
              <div className="p-4">
                <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nivel Cunoștințe</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Începător</p>
              </div>
            </AnimatedCard>
          </div>
        </TabPanel>
      )
    },
    {
      id: 'progress',
      label: 'Progresul Tău',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      content: (
        <TabPanel>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Începe să înveți pentru a-ți vedea progresul aici!</p>
          </div>
        </TabPanel>
      )
    }
  ]

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Header 
          title={`${config.APP_NAME} - Dashboard`}
          showThemeSwitcher={true}
          showAdminButton={true}
          showUserInfo={true}
          showLogout={true}
        />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <AnimatedCard variant="hover" animationType="slideUp" delay={0.2} className="p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Salut {user.first_name}! 👋
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Bine ai venit în ZAEUS - asistentul tău AI pentru trading. 
                Sunt aici să te ajut să înveți, să analizezi piețele și să-ți îmbunătățești strategiile de tranzacționare.
              </p>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Email: {user.email}</span>
                {user.email_verified && (
                  <AnimatedTooltip content="Email verificat">
                    <span className="text-green-600 dark:text-green-400">✓ Verificat</span>
                  </AnimatedTooltip>
                )}
              </div>
            </div>
            <IconTooltip content="Click pentru mai multe detalii" />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowWelcomeModal(true)}
            className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
          >
            Află mai multe despre ZAEUS →
          </motion.button>
        </AnimatedCard>

        {/* Quick Actions */}
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <InteractiveCard 
            className="p-6 cursor-pointer"
            onClick={() => navigate('/chat')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Activ</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Chat cu 00Z</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Începe o conversație cu agentul tău personal AI
            </p>
            <motion.div
              whileHover={{ x: 5 }}
              className="flex items-center text-sm text-primary font-medium"
            >
              <span>Deschide Chat</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </InteractiveCard>

          <InteractiveCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Coming Soon</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Analiză Piață</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Vezi analize și predicții pentru piețele tale preferate
            </p>
          </InteractiveCard>

          <InteractiveCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Coming Soon</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Educație</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Cursuri și materiale educaționale personalizate
            </p>
          </InteractiveCard>
        </StaggerChildren>

        {/* Dashboard Tabs */}
        <AnimatedCard className="p-6 mb-8" animationType="fadeIn" delay={0.4}>
          <AnimatedTabs tabs={dashboardTabs} variant="pills" />
        </AnimatedCard>

        {/* Recent Activity */}
        <AnimatedCard variant="default" animationType="fadeIn" delay={0.6} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activitate Recentă</h3>
          {isLoadingActivity ? (
            <SkeletonLoader count={3} className="h-12" />
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <motion.svg 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 20 }}
                className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </motion.svg>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                Nu ai activitate recentă
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm mt-2"
              >
                Începe o conversație cu 00Z pentru a vedea activitatea ta aici
              </motion.p>
            </div>
          )}
        </AnimatedCard>
      </main>

      {/* Welcome Modal */}
      <AnimatedModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        title="Despre ZAEUS"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            ZAEUS este mai mult decât un simplu asistent AI - este mentorul tău personal în lumea tradingului.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-300 font-semibold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Învățare Personalizată</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Conținut adaptat nivelului tău de experiență</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 dark:text-green-300 font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Analiză în Timp Real</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Monitorizează piețele și primește alerte personalizate</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-300 font-semibold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Comunitate Activă</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Conectează-te cu alți traderi și împărtășește experiențe</p>
              </div>
            </div>
          </div>
        </div>
        
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowWelcomeModal(false)}>
            Am înțeles
          </Button>
          <Button onClick={() => {
            setShowWelcomeModal(false)
            // Navigate to chat when implemented
          }}>
            Începe cu 00Z
          </Button>
        </ModalFooter>
      </AnimatedModal>
    </div>
    </PageTransition>
  )
}