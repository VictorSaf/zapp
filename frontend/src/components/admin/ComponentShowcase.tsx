import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { componentRegistry, getComponentsByCategory, ComponentInfo } from '../../utils/component-registry'
import { AnimatedCard } from '../ui/AnimatedCard'
import { AnimatedModal, ModalFooter } from '../ui/AnimatedModal'
import { Button } from '../ui/Button'
import { StaggerChildren } from '../animations'
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Caută componente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full px-4 py-2 rounded-lg",
              "bg-white dark:bg-gray-800",
              "border border-gray-300 dark:border-gray-600",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200"
            )}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {cat === 'all' ? 'Toate' : categoryLabels[cat]}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StaggerChildren staggerDelay={0.05}>
          {filteredComponents.map((component) => (
            <motion.div
              key={component.name}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedComponent(component)}
            >
              <AnimatedCard 
                variant="interactive" 
                className="h-full cursor-pointer"
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
            </motion.div>
          ))}
        </StaggerChildren>
      </div>

      {/* Component Details Modal */}
      <AnimatedModal
        isOpen={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        title={selectedComponent?.name || ''}
        size="lg"
      >
        {selectedComponent && (
          <div className="space-y-6">
            {/* Header */}
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

            {/* Used In Pages */}
            <div>
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
            </div>

            {/* Props */}
            {selectedComponent.props && (
              <div>
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
              </div>
            )}

            {/* Variants */}
            {selectedComponent.variants && (
              <div>
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
              </div>
            )}

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Caracteristici:
              </h3>
              <ul className="space-y-2">
                {selectedComponent.features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start space-x-2"
                  >
                    <span className="text-primary mt-0.5">•</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {feature}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>

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