import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { componentRegistry, getComponentsByCategory, ComponentInfo } from '../../utils/component-registry'
import { AnimatedCard } from '../ui/AnimatedCard'
import { AnimatedModal, ModalFooter } from '../ui/AnimatedModal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { StaggerChildren } from '../animations'
import { ComponentPreview } from './ComponentPreview'
import { cn } from '../../utils/cn'

const categoryColors = {
  ui: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  layout: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
  animation: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
  form: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  data: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
  feedback: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
}

const categoryLabels = {
  ui: 'UI Components',
  layout: 'Layout',
  animation: 'Animații',
  form: 'Formulare',
  data: 'Date',
  feedback: 'Feedback'
}

export const ComponentShowcase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ComponentInfo['category'] | 'all'>('all')
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredComponents = (selectedCategory === 'all' 
    ? componentRegistry 
    : getComponentsByCategory(selectedCategory)
  ).filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categories: Array<ComponentInfo['category'] | 'all'> = ['all', 'ui', 'layout', 'animation', 'form', 'data', 'feedback']

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <AnimatedCard variant="default" className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Caută componente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              label=""
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'Toate' : categoryLabels[cat]}
              </Button>
            ))}
          </div>
        </div>
      </AnimatedCard>

      {/* Components Grid */}
      <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComponents.map((component) => (
          <AnimatedCard 
            key={component.name}
            variant="interactive" 
            className="h-full cursor-pointer"
            onClick={() => setSelectedComponent(component)}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{component.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {component.name}
                    </h3>
                    <span className={cn(
                      "inline-block px-2 py-0.5 text-xs rounded-full mt-1",
                      categoryColors[component.category]
                    )}>
                      {categoryLabels[component.category]}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {component.description}
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Folosit în {component.usedIn.length} pagini
                </span>
                {component.variants && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {component.variants.length} variante
                  </span>
                )}
              </div>
            </div>
          </AnimatedCard>
        ))}
      </StaggerChildren>

      {/* Component Details Modal */}
      <AnimatedModal
        isOpen={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        title={selectedComponent?.name || ''}
        size="xl"
      >
        {selectedComponent && (
          <div className="space-y-6">
            {/* Header */}
            <AnimatedCard variant="default" className="p-4">
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{selectedComponent.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedComponent.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedComponent.description}
                  </p>
                </div>
              </div>
            </AnimatedCard>

            {/* Component Preview */}
            <ComponentPreview componentName={selectedComponent.name} />

            {/* Component Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Used In Pages */}
              <AnimatedCard variant="default" className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Folosit în paginile:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedComponent.usedIn.map(page => (
                    <span
                      key={page}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
                    >
                      {page}
                    </span>
                  ))}
                </div>
              </AnimatedCard>

              {/* Props */}
              {selectedComponent.props && (
                <AnimatedCard variant="default" className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Props disponibile:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedComponent.props.map(prop => (
                      <code
                        key={prop}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono"
                      >
                        {prop}
                      </code>
                    ))}
                  </div>
                </AnimatedCard>
              )}

              {/* Variants */}
              {selectedComponent.variants && (
                <AnimatedCard variant="default" className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Variante:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedComponent.variants.map(variant => (
                      <span
                        key={variant}
                        className="px-3 py-1 bg-primary/10 text-primary dark:bg-primary/20 rounded-full text-sm"
                      >
                        {variant}
                      </span>
                    ))}
                  </div>
                </AnimatedCard>
              )}
            </div>

            {/* Features */}
            <AnimatedCard variant="default" className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Caracteristici:
              </h3>
              <StaggerChildren className="space-y-2">
                {selectedComponent.features.map((feature, index) => (
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
            </AnimatedCard>

            {/* Category Badge */}
            <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
              <span className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                categoryColors[selectedComponent.category]
              )}>
                {categoryLabels[selectedComponent.category]}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total utilizări: {selectedComponent.usedIn.length}
              </span>
            </div>
          </div>
        )}
        
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setSelectedComponent(null)}
          >
            Închide
          </Button>
        </ModalFooter>
      </AnimatedModal>
    </div>
  )
}