import React, { useState } from 'react'
import { Input, InputProps } from './Input'
import { cn } from '../../utils/cn'

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean
  strength?: boolean
}

const getPasswordStrength = (password: string): { strength: number; text: string; color: string } => {
  if (!password) return { strength: 0, text: '', color: '' }
  
  let strength = 0
  if (password.length >= 8) strength++
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
  if (password.match(/[0-9]/)) strength++
  if (password.match(/[^a-zA-Z0-9]/)) strength++
  
  const strengthLevels = [
    { strength: 1, text: 'Slabă', color: 'bg-red-500' },
    { strength: 2, text: 'Medie', color: 'bg-yellow-500' },
    { strength: 3, text: 'Bună', color: 'bg-blue-500' },
    { strength: 4, text: 'Puternică', color: 'bg-green-500' }
  ]
  
  return strengthLevels.find(level => level.strength === strength) || { strength: 0, text: '', color: '' }
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showToggle = true,
  strength = false,
  className,
  value = '',
  onChange,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const passwordStrength = getPasswordStrength(value as string)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={cn(showToggle && 'pr-10', className)}
        />
        
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            )}
            aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {strength && value && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  level <= passwordStrength.strength
                    ? passwordStrength.color
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            ))}
          </div>
          {passwordStrength.text && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Putere parolă: <span className="font-medium">{passwordStrength.text}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}