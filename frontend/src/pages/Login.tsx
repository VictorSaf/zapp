import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth.store'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { config } from '../config/env'
import { PageTransition, FadeIn, SlideUp } from '../components/animations'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}
    
    if (!formData.email) {
      errors.email = 'Email este obligatoriu'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format email invalid'
    }
    
    if (!formData.password) {
      errors.password = 'Parola este obligatorie'
    } else if (formData.password.length < 6) {
      errors.password = 'Parola trebuie să aibă minim 6 caractere'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear validation error when user types
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }))
    }
    
    // Clear general error
    if (error) {
      clearError()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      await login(formData)
      navigate('/dashboard')
    } catch (err) {
      // Error is handled by the store
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full">
          {/* Logo/Header */}
          <FadeIn>
            <div className="text-center mb-8">
              <motion.h1 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
              >
                {config.APP_NAME}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-600 dark:text-gray-300"
              >
                Asistentul tău AI pentru trading
              </motion.p>
            </div>
          </FadeIn>

          {/* Login Form */}
          <SlideUp delay={0.3}>
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8"
            >
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-semibold text-gray-900 dark:text-white mb-6"
              >
                Conectează-te
              </motion.h2>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Alert variant="destructive" className="mb-4">
                    {error}
                  </Alert>
                </motion.div>
              )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="email@exemplu.com"
              value={formData.email}
              onChange={handleChange}
              error={validationErrors.email}
              disabled={isLoading}
            />

            <Input
              type="password"
              name="password"
              label="Parolă"
              placeholder="Introdu parola"
              value={formData.password}
              onChange={handleChange}
              error={validationErrors.password}
              disabled={isLoading}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                />
                <span className="text-gray-600 dark:text-gray-300">Ține-mă conectat</span>
              </label>
              
              <a
                href="#"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Ai uitat parola?
              </a>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Conectează-te
              </Button>
            </motion.div>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nu ai cont?{' '}
              <Link
                to="/register"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Înregistrează-te
              </Link>
            </p>
          </div>
            </motion.div>
          </SlideUp>

          {/* Footer */}
          <FadeIn delay={0.6}>
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>&copy; 2025 {config.APP_NAME}. Toate drepturile rezervate.</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  )
}