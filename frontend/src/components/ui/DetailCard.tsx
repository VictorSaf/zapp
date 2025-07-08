import React from 'react'
import { Card, CardContent } from './Card'
import { cn } from '../../utils/cn'

interface DetailCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export const DetailCard: React.FC<DetailCardProps> = ({ title, children, className }) => {
  return (
    <Card variant="default" padding="md" className={className}>
      <CardContent>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  )
}

// Tag List Component for items like pages, props, variants
interface TagListProps {
  items: string[]
  variant?: 'default' | 'primary' | 'code'
  className?: string
}

export const TagList: React.FC<TagListProps> = ({ items, variant = 'default', className }) => {
  const variantClasses = {
    default: 'px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm',
    primary: 'px-3 py-1 bg-primary/10 text-primary dark:bg-primary/20 rounded-full text-sm',
    code: 'px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono'
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map(item => (
        <span
          key={item}
          className={variantClasses[variant]}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

// Info Grid for displaying key-value pairs
interface InfoItem {
  label: string
  value: string | number
  valueClassName?: string
}

interface InfoGridProps {
  items: InfoItem[]
  className?: string
}

export const InfoGrid: React.FC<InfoGridProps> = ({ items, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
          <span className={cn("font-semibold", item.valueClassName)}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// Feature List Component
interface FeatureListProps {
  features: string[]
  className?: string
  animate?: boolean
}

export const FeatureList: React.FC<FeatureListProps> = ({ features, className, animate = false }) => {
  const listContent = features.map((feature, index) => (
    <li
      key={index}
      className="flex items-start space-x-2 list-none"
    >
      <span className="text-primary mt-0.5">•</span>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {feature}
      </span>
    </li>
  ))

  if (animate) {
    const { StaggerChildren } = require('../animations')
    const { motion } = require('framer-motion')
    
    return (
      <StaggerChildren className={cn("space-y-2", className)}>
        {features.map((feature, index) => (
          <motion.li
            key={index}
            className="flex items-start space-x-2 list-none"
          >
            <span className="text-primary mt-0.5">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {feature}
            </span>
          </motion.li>
        ))}
      </StaggerChildren>
    )
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {listContent}
    </ul>
  )
}

// Section Card - for larger sections with optional icon
interface SectionCardProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export const SectionCard: React.FC<SectionCardProps> = ({ 
  title, 
  icon, 
  children, 
  className,
  actions 
}) => {
  return (
    <Card variant="default" padding="md" className={className}>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {actions && <div>{actions}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}