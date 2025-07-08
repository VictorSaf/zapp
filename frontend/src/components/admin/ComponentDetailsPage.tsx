import React from 'react'
import { motion } from 'framer-motion'
import { ComponentInfo } from '../../utils/component-registry'
import { DetailCard, TagList, FeatureList, SectionCard } from '../ui/DetailCard'
import { Button } from '../ui/Button'
import { ComponentPreview } from './ComponentPreview'
import { cn } from '../../utils/cn'

interface ComponentDetailsPageProps {
  component: ComponentInfo
  onClose: () => void
}

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

export const ComponentDetailsPage: React.FC<ComponentDetailsPageProps> = ({ 
  component, 
  onClose 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header with Close Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Înapoi la lista de componente"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {component.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Detalii componente UI
            </p>
          </div>
        </div>
        
        <motion.div
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            categoryColors[component.category]
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {categoryLabels[component.category]}
        </motion.div>
      </div>

      {/* Component Overview */}
      <SectionCard 
        title="Overview"
        icon={component.icon}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              📋 Copy Import
            </Button>
            <Button variant="primary" size="sm">
              📖 View Docs
            </Button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          {component.description}
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-primary">{component.usedIn.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pagini</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-primary">{component.variants?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Variante</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-primary">{component.props?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Props</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-primary">{component.features.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Features</div>
          </div>
        </div>
      </SectionCard>

      {/* Live Preview */}
      <SectionCard 
        title="Live Preview" 
        icon="🎬"
        actions={
          <Button variant="outline" size="sm">
            🔄 Reset Preview
          </Button>
        }
      >
        <ComponentPreview componentName={component.name} />
      </SectionCard>

      {/* Component Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Usage Information */}
          <DetailCard title="📍 Folosit în paginile:">
            <TagList items={component.usedIn} />
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Acest component este folosit în {component.usedIn.length} pagini diferite, 
                demonstrând versatilitatea și utilitatea sa în aplicație.
              </p>
            </div>
          </DetailCard>

          {/* API Documentation */}
          {component.props && (
            <DetailCard title="⚙️ Props disponibile:">
              <TagList items={component.props} variant="code" />
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vezi documentația completă pentru descrieri detaliate ale fiecărui prop.
                </p>
              </div>
            </DetailCard>
          )}

          {/* Variants */}
          {component.variants && (
            <DetailCard title="🎨 Variante disponibile:">
              <TagList items={component.variants} variant="primary" />
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✨ Toate variantele sunt disponibile în preview-ul de mai sus. 
                  Experimentează cu ele pentru a vedea diferențele!
                </p>
              </div>
            </DetailCard>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Features */}
          <DetailCard title="⭐ Caracteristici principale:">
            <FeatureList features={component.features} animate />
          </DetailCard>

          {/* Code Example */}
          <DetailCard title="💻 Exemplu de cod:">
            <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{`import { ${component.name} } from '@/components/ui'

// Exemplu de utilizare de bază
<${component.name}${component.props ? `
  ${component.props.slice(0, 2).map(prop => `${prop}="value"`).join('\n  ')}` : ''}
>
  Conținut aici
</${component.name}>`}</code>
              </pre>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm">
                📋 Copy Code
              </Button>
              <Button variant="outline" size="sm">
                🚀 Try in Playground
              </Button>
            </div>
          </DetailCard>

          {/* Related Components */}
          <DetailCard title="🔗 Componente similare:">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Alte componente din categoria <strong>{categoryLabels[component.category]}</strong>:
              </p>
              <div className="flex flex-wrap gap-2">
                {/* This would be populated with actual related components */}
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Button
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Input
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Card
                </span>
              </div>
            </div>
          </DetailCard>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            ← Înapoi la lista
          </Button>
          <Button variant="primary">
            📝 Edit Component
          </Button>
        </div>
      </div>
    </motion.div>
  )
}