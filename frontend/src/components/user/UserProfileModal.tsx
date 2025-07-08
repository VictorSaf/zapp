import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnimatedModal, ModalFooter } from '../ui/AnimatedModal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { AnimatedLoader } from '../ui/AnimatedLoader'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    try {
      console.log('Submitting profile update:', formData)
      await updateProfile(formData)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      console.error('Profile update error:', err)
      setError(err.message || 'Eroare la actualizarea profilului')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value })
  }

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalii Profil"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            {user?.is_admin && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs bg-primary text-white rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">ID Utilizator: {user?.id}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Membru din: {user?.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO') : '-'}
          </p>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prenume"
            value={formData.first_name}
            onChange={handleInputChange('first_name')}
            required
          />
          
          <Input
            label="Nume"
            value={formData.last_name}
            onChange={handleInputChange('last_name')}
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          required
          disabled
          helperText="Email-ul nu poate fi modificat"
        />

        <Input
          label="Telefon"
          type="tel"
          value={formData.phone}
          onChange={handleInputChange('phone')}
          placeholder="+40 7XX XXX XXX"
        />

        {/* Status Messages */}
        {error && (
          <Alert
            type="error"
            title="Eroare"
            message={error}
          />
        )}

        {success && (
          <Alert
            type="success"
            title="Succes"
            message="Profilul a fost actualizat cu succes!"
          />
        )}

        {/* Email Verification Status */}
        {user && !user.email_verified && (
          <Alert
            type="warning"
            title="Email neverificat"
            message="Te rugăm să îți verifici adresa de email pentru a accesa toate funcționalitățile."
          />
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Anulează
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <AnimatedLoader size="sm" />
                <span>Salvează...</span>
              </span>
            ) : (
              'Salvează Modificările'
            )}
          </Button>
        </ModalFooter>
      </form>
    </AnimatedModal>
  )
}