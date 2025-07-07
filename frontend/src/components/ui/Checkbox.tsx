import React, { forwardRef } from 'react'
import { cn } from '../../utils/cn'

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const id = props.id || props.name

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              'h-4 w-4 rounded border transition-colors',
              'border-gray-300 bg-white text-primary',
              'dark:border-gray-600 dark:bg-gray-700',
              'focus:ring-2 focus:ring-primary focus:ring-offset-0',
              'dark:focus:ring-offset-gray-900',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500 dark:border-red-500',
              className
            )}
            ref={ref}
            id={id}
            {...props}
          />
        </div>
        {label && (
          <div className="ml-3 text-sm">
            <label
              htmlFor={id}
              className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              {label}
            </label>
            {helperText && !error && (
              <p className="text-gray-500 dark:text-gray-400">{helperText}</p>
            )}
            {error && (
              <p className="text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'