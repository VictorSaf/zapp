import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { componentRegistry, getComponentsByCategory, ComponentInfo } from '../../utils/component-registry'
import { Card, CardHeader, CardTitle, CardBadge, CardDescription, CardFooter, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { StaggerChildren } from '../animations'
import { ComponentDetailsPage } from './ComponentDetailsPage'
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

  // If a component is selected, show the details page
  if (selectedComponent) {
    return (
      <ComponentDetailsPage 
        component={selectedComponent}
        onClose={() => setSelectedComponent(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Componente UI
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Explorează și testează toate componentele disponibile
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredComponents.length} componente
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <Card variant="default" padding="md">
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
      </Card>

      {/* Components Grid */}
      <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComponents.map((component) => (
          <Card 
            key={component.name}
            variant="interactive"
            onClick={() => setSelectedComponent(component)}
          >
            <CardContent>
              <CardHeader icon={component.icon}>
                <div>
                  <CardTitle>{component.name}</CardTitle>
                  <CardBadge className={cn(categoryColors[component.category])}>
                    {categoryLabels[component.category]}
                  </CardBadge>
                </div>
              </CardHeader>
              
              <CardDescription clamp>
                {component.description}
              </CardDescription>
              
              <CardFooter>
                <span>Folosit în {component.usedIn.length} pagini</span>
                {component.variants && (
                  <span>{component.variants.length} variante</span>
                )}
              </CardFooter>
            </CardContent>
          </Card>
        ))}
      </StaggerChildren>
    </div>
  )
}