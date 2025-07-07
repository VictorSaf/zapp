import React, { forwardRef } from 'react'
import { cn } from '../../utils/cn'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    const id = props.id || props.name

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors',
            'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500',
            'dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800',
            error && 'border-red-500 focus:ring-red-500 dark:border-red-500',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'