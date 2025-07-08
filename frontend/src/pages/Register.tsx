import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { PageTransition, SlideUp, FadeIn } from '../components/animations'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { config } from '../config/env'
import { cn } from '../utils/cn'
import { PasswordInput } from '../components/ui/PasswordInput'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
}

export const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      errors.email = 'Email este obligatoriu'
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Email invalid'
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Parola este obligatorie'
    } else if (formData.password.length < 8) {
      errors.password = 'Parola trebuie să aibă minim 8 caractere'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Parola trebuie să conțină litere mari, mici și cifre'
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmarea parolei este obligatorie'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Parolele nu se potrivesc'
    }
    
    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'Prenumele este obligatoriu'
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Numele este obligatoriu'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }
      
      if (data.success) {
        setSuccess(true)
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la înregistrare')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value })
    // Clear error for this field when user types
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined })
    }
  }

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <SlideUp>
          <AnimatedCard 
            variant="hover" 
            className="w-full max-w-md p-8"
            animationType="slideUp"
          >
            <FadeIn delay={0.2}>
              <div className="text-center mb-8">
                <motion.h1 
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Bine ai venit la {config.APP_NAME}
                </motion.h1>
                <motion.p 
                  className="text-gray-600 dark:text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Creează-ți contul pentru a începe
                </motion.p>
              </div>
            </FadeIn>

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert
                  type="success"
                  title="Înregistrare reușită!"
                  message="Contul a fost creat cu succes. Vei fi redirecționat către login..."
                />
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert
                  type="error"
                  title="Eroare"
                  message={error}
                />
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div 
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  variants={inputVariants}
                  whileFocus="focus"
                >
                  <Input
                    label="Prenume"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    error={formErrors.firstName}
                    placeholder="Ion"
                    required
                  />
                </motion.div>
                <motion.div
                  variants={inputVariants}
                  whileFocus="focus"
                >
                  <Input
                    label="Nume"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    error={formErrors.lastName}
                    placeholder="Popescu"
                    required
                  />
                </motion.div>
              </motion.div>

              <motion.div
                variants={inputVariants}
                whileFocus="focus"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  error={formErrors.email}
                  placeholder="email@exemplu.com"
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <motion.div
                  variants={inputVariants}
                  whileFocus="focus"
                >
                  <PasswordInput
                    label="Parolă"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={formErrors.password}
                    placeholder="••••••••"
                    strength={true}
                    required
                  />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  variants={inputVariants}
                  whileFocus="focus"
                >
                  <PasswordInput
                    label="Confirmă Parola"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    error={formErrors.confirmPassword}
                    placeholder="••••••••"
                    required
                  />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || success}
                >
                  {isLoading ? 'Se creează contul...' : 'Înregistrează-te'}
                </Button>
              </motion.div>

              <motion.p 
                className="text-center text-sm text-gray-600 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Ai deja cont?{' '}
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary-dark font-medium transition-colors"
                >
                  Conectează-te
                </Link>
              </motion.p>
            </form>
          </AnimatedCard>
        </SlideUp>
      </div>
    </PageTransition>
  )
}