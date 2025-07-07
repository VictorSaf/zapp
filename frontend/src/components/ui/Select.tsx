import React, { forwardRef } from 'react'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectGroup {
  label: string
  options: SelectOption[]
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  groups?: SelectGroup[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, groups, ...props }, ref) => {
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
        <select
          className={cn(
            'flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors',
            'border-gray-300 bg-white text-gray-900',
            'dark:border-gray-600 dark:bg-gray-700 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800',
            error && 'border-red-500 focus:ring-red-500 dark:border-red-500',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        >
          {/* Render simple options */}
          {options && options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
          
          {/* Render grouped options */}
          {groups && groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
          
          {/* Allow children for custom options */}
          {!options && !groups && props.children}
        </select>
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

Select.displayName = 'Select'