import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Checkbox } from '../ui/Checkbox'
import { AnimatedCard } from '../ui/AnimatedCard'
import { Card, CardHeader, CardTitle, CardBadge, CardDescription, CardFooter, CardContent } from '../ui/Card'
import { PreviewCard, AccessibleCard, AccessibleCardHeader, AccessibleCardTitle, AccessibleCardBadge, AccessibleCardDescription, AccessibleCardFooter, AccessibleCardContent } from '../ui/AccessibleCard'
import { DetailCard, TagList, FeatureList, InfoGrid, SectionCard } from '../ui/DetailCard'
import { AnimatedModal, ModalFooter } from '../ui/AnimatedModal'
import { AnimatedTabs, TabPanel } from '../ui/AnimatedTabs'
import { AnimatedLoader } from '../ui/AnimatedLoader'
import { Alert } from '../ui/Alert'
import { AnimatedTooltip } from '../ui/AnimatedTooltip'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { ScrollProgress } from '../ui/ScrollProgress'
import { PasswordInput } from '../ui/PasswordInput'
import { FeatureToggle } from '../ui/FeatureToggle'
import { StatCard } from '../ui/StatCard'
import { ConnectionStatus } from '../chat/ConnectionStatus'
import { TypingIndicator } from '../chat/TypingIndicator'
import { ChatInput } from '../chat/ChatInput'
import { PageTransition } from '../animations/PageTransition'
import { StaggerChildren } from '../animations/StaggerChildren'
import { FadeIn } from '../animations/FadeIn'
import { SlideUp } from '../animations/SlideUp'
import { Message } from '../../stores/chat.store'
import { cn } from '../../utils/cn'

interface MessageItemProps {
  message: Message & { agent?: string }
  isOwn: boolean
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwn }) => {
  return (
    <div className={cn(
      "flex",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-lg px-4 py-2",
        isOwn 
          ? "bg-primary text-white" 
          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
      )}>
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  )
}

interface ComponentPreviewProps {
  componentName: string
}

export const ComponentPreview: React.FC<ComponentPreviewProps> = ({ componentName }) => {
  const [showModal, setShowModal] = React.useState(false)
  const [selectedTab, setSelectedTab] = React.useState(0)
  const [checkboxChecked, setCheckboxChecked] = React.useState(true)
  const [inputValue, setInputValue] = React.useState('')
  const [selectValue, setSelectValue] = React.useState('option1')
  
  // State for variant selection
  const [selectedButtonVariant, setSelectedButtonVariant] = React.useState<'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'>('primary')
  const [selectedButtonSize, setSelectedButtonSize] = React.useState<'sm' | 'md' | 'lg'>('md')
  const [selectedCardVariant, setSelectedCardVariant] = React.useState<'default' | 'interactive' | 'outline'>('default')
  const [selectedCardPadding, setSelectedCardPadding] = React.useState<'none' | 'sm' | 'md' | 'lg'>('md')
  const [selectedAnimatedCardVariant, setSelectedAnimatedCardVariant] = React.useState<'default' | 'hover' | 'interactive'>('default')
  const [selectedAnimatedCardAnimation, setSelectedAnimatedCardAnimation] = React.useState<'fadeIn' | 'slideUp' | 'scaleIn'>('fadeIn')
  const [selectedTabVariant, setSelectedTabVariant] = React.useState<'default' | 'pills' | 'underline'>('pills')
  const [selectedLoaderVariant, setSelectedLoaderVariant] = React.useState<'spinner' | 'dots' | 'bars'>('spinner')
  const [selectedLoaderSize, setSelectedLoaderSize] = React.useState<'sm' | 'md' | 'lg'>('md')
  const [selectedAlertType, setSelectedAlertType] = React.useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [selectedThemeVariant, setSelectedThemeVariant] = React.useState<'dropdown' | 'toggle' | 'buttons'>('dropdown')
  const [selectedModalSize, setSelectedModalSize] = React.useState<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md')

  const renderPreview = () => {
    switch (componentName) {
      case 'Button':
        return (
          <div className="space-y-6">
            {/* Variant Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Varianta
                </label>
                <Select
                  value={selectedButtonVariant}
                  onChange={(e) => setSelectedButtonVariant(e.target.value as any)}
                  options={[
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'outline', label: 'Outline' },
                    { value: 'ghost', label: 'Ghost' },
                    { value: 'destructive', label: 'Destructive' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Mărimea
                </label>
                <Select
                  value={selectedButtonSize}
                  onChange={(e) => setSelectedButtonSize(e.target.value as any)}
                  options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' }
                  ]}
                />
              </div>
            </div>

            {/* Live Preview with Selected Variant */}
            <DetailCard title="Preview cu varianta selectată:">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant={selectedButtonVariant} size={selectedButtonSize}>
                  Button Normal
                </Button>
                <Button variant={selectedButtonVariant} size={selectedButtonSize} disabled>
                  Button Disabled
                </Button>
                <Button variant={selectedButtonVariant} size={selectedButtonSize} loading>
                  Loading
                </Button>
              </div>
            </DetailCard>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate variantele:</p>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" size="md">Primary</Button>
                  <Button variant="secondary" size="md">Secondary</Button>
                  <Button variant="outline" size="md">Outline</Button>
                  <Button variant="ghost" size="md">Ghost</Button>
                  <Button variant="destructive" size="md">Destructive</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant={selectedButtonVariant} size="sm">Small</Button>
                  <Button variant={selectedButtonVariant} size="md">Medium</Button>
                  <Button variant={selectedButtonVariant} size="lg">Large</Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'Input':
        return (
          <div className="space-y-4 max-w-md">
            <Input
              label="Text Input"
              placeholder="Enter text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              label="Email Input"
              type="email"
              placeholder="email@example.com"
              helperText="We'll never share your email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
            />
            <Input
              label="With Error"
              placeholder="Invalid input"
              error="This field is required"
            />
            <Input
              label="Disabled"
              placeholder="Cannot edit"
              disabled
            />
          </div>
        )

      case 'Select':
        return (
          <div className="space-y-4 max-w-md">
            <Select
              label="Simple Select"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' }
              ]}
            />
            <Select
              label="Grouped Select"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              helperText="Select your preferred option"
              groups={[
                {
                  label: "Group A",
                  options: [
                    { value: 'a1', label: 'Item A1' },
                    { value: 'a2', label: 'Item A2' }
                  ]
                },
                {
                  label: "Group B",
                  options: [
                    { value: 'b1', label: 'Item B1' },
                    { value: 'b2', label: 'Item B2' }
                  ]
                }
              ]}
            />
          </div>
        )

      case 'Checkbox':
        return (
          <div className="space-y-4">
            <Checkbox
              label="Active checkbox"
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
            />
            <Checkbox
              label="Unchecked checkbox"
              checked={false}
              onChange={() => {}}
            />
            <Checkbox
              label="Disabled checked"
              checked={true}
              disabled
            />
            <Checkbox
              label="Disabled unchecked"
              checked={false}
              disabled
            />
          </div>
        )

      case 'AnimatedCard':
        return (
          <div className="space-y-6">
            {/* Variant Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Varianta Card
                </label>
                <Select
                  value={selectedAnimatedCardVariant}
                  onChange={(e) => setSelectedAnimatedCardVariant(e.target.value as any)}
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'hover', label: 'Hover' },
                    { value: 'interactive', label: 'Interactive' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Animația
                </label>
                <Select
                  value={selectedAnimatedCardAnimation}
                  onChange={(e) => setSelectedAnimatedCardAnimation(e.target.value as any)}
                  options={[
                    { value: 'fadeIn', label: 'Fade In' },
                    { value: 'slideUp', label: 'Slide Up' },
                    { value: 'scaleIn', label: 'Scale In' }
                  ]}
                />
              </div>
            </div>

            {/* Live Preview with Selected Variant */}
            <PreviewCard title="Preview cu varianta selectată:">
              <AnimatedCard variant={selectedAnimatedCardVariant} animationType={selectedAnimatedCardAnimation}>
                <div className="p-6">
                  <h3 className="font-semibold mb-2">Card cu {selectedAnimatedCardVariant} / {selectedAnimatedCardAnimation}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Acesta este un card cu varianta {selectedAnimatedCardVariant} și animație {selectedAnimatedCardAnimation}.
                    {selectedAnimatedCardVariant === 'hover' && ' Treci cu mouse-ul peste card pentru efecte.'}
                    {selectedAnimatedCardVariant === 'interactive' && ' Click pe card pentru interacțiune.'}
                  </p>
                </div>
              </AnimatedCard>
            </PreviewCard>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate variantele:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AnimatedCard variant="default" animationType="fadeIn">
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">Default Card</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Basic card cu fade in
                    </p>
                  </div>
                </AnimatedCard>
                <AnimatedCard variant="hover" animationType="slideUp">
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">Hover Card</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Card cu efecte hover și slide up
                    </p>
                  </div>
                </AnimatedCard>
                <AnimatedCard variant="interactive" animationType="scaleIn">
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">Interactive Card</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click me! Scale in animation
                    </p>
                  </div>
                </AnimatedCard>
              </div>
            </div>
          </div>
        )

      case 'Card':
        return (
          <div className="space-y-6">
            {/* Variant Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Varianta
                </label>
                <Select
                  value={selectedCardVariant}
                  onChange={(e) => setSelectedCardVariant(e.target.value as any)}
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'interactive', label: 'Interactive' },
                    { value: 'outline', label: 'Outline' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Padding
                </label>
                <Select
                  value={selectedCardPadding}
                  onChange={(e) => setSelectedCardPadding(e.target.value as any)}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' }
                  ]}
                />
              </div>
            </div>

            {/* Live Preview with Selected Variant */}
            <PreviewCard title="Preview cu varianta selectată:">
              <Card variant={selectedCardVariant} padding={selectedCardPadding}>
                <CardContent>
                  <CardHeader icon="🎯">
                    <CardTitle>Card Component</CardTitle>
                    <CardBadge variant="primary">New</CardBadge>
                  </CardHeader>
                  <CardDescription>
                    Acesta este un Card cu varianta <strong>{selectedCardVariant}</strong> și padding <strong>{selectedCardPadding}</strong>.
                  </CardDescription>
                  <CardFooter>
                    <span>3 componente</span>
                    <span>Actualizat acum</span>
                  </CardFooter>
                </CardContent>
              </Card>
            </PreviewCard>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Exemple de utilizare:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Component Showcase Style Card */}
                <Card variant="interactive" onClick={() => alert('Card clicked!')}>
                  <CardContent>
                    <CardHeader icon="🔘">
                      <div>
                        <CardTitle>Button Component</CardTitle>
                        <CardBadge variant="primary">UI</CardBadge>
                      </div>
                    </CardHeader>
                    <CardDescription clamp>
                      Buton interactiv cu multiple variante și dimensiuni. Include loading states și animații smooth.
                    </CardDescription>
                    <CardFooter>
                      <span>Folosit în 5 pagini</span>
                      <span>5 variante</span>
                    </CardFooter>
                  </CardContent>
                </Card>

                {/* Simple Card */}
                <Card variant="default" padding="lg">
                  <CardTitle>Simple Card</CardTitle>
                  <CardDescription>
                    Un card simplu cu titlu și descriere. Poate fi folosit pentru afișarea de conținut static.
                  </CardDescription>
                </Card>

                {/* Outline Card with Badge */}
                <Card variant="outline">
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <CardTitle>Stats Card</CardTitle>
                      <CardBadge variant="success">Active</CardBadge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Users</span>
                        <span className="font-semibold">1,234</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Active Now</span>
                        <span className="font-semibold text-green-600">89</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card with no padding */}
                <Card variant="default" padding="none" className="overflow-hidden">
                  <img 
                    src="https://via.placeholder.com/400x200/1a365d/ffffff?text=Card+Image" 
                    alt="Card with image"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-4">
                    <CardTitle>Image Card</CardTitle>
                    <CardDescription>Card cu imagine și padding customizat</CardDescription>
                  </div>
                </Card>

                {/* Error state card */}
                <Card variant="outline">
                  <CardContent>
                    <CardHeader icon="⚠️">
                      <div>
                        <CardTitle>Error Report</CardTitle>
                        <CardBadge variant="error">Critical</CardBadge>
                      </div>
                    </CardHeader>
                    <CardDescription>
                      S-a detectat o eroare în sistem. Verifică logs pentru detalii.
                    </CardDescription>
                    <div className="mt-3">
                      <Button variant="destructive" size="sm">View Details</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Complex card with all elements */}
                <Card variant="interactive">
                  <CardContent>
                    <CardHeader icon="📊">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>Analytics Dashboard</CardTitle>
                          <CardBadge variant="warning">Beta</CardBadge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last updated 5 min ago
                        </p>
                      </div>
                    </CardHeader>
                    <CardDescription>
                      Monitorizează performanța aplicației în timp real cu metrici detaliate și grafice interactive.
                    </CardDescription>
                    <div className="flex gap-2 mt-3">
                      <Button variant="primary" size="sm">Open Dashboard</Button>
                      <Button variant="outline" size="sm">Settings</Button>
                    </div>
                    <CardFooter className="mt-4 pt-4 border-t dark:border-gray-700">
                      <span>12 widgets active</span>
                      <span className="text-green-600 dark:text-green-400">Online</span>
                    </CardFooter>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )

      case 'AnimatedModal':
        return (
          <div className="space-y-6">
            {/* Variant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selectează Mărimea Modal
              </label>
              <Select
                value={selectedModalSize}
                onChange={(e) => setSelectedModalSize(e.target.value as any)}
                options={[
                  { value: 'sm', label: 'Small' },
                  { value: 'md', label: 'Medium' },
                  { value: 'lg', label: 'Large' },
                  { value: 'xl', label: 'Extra Large' },
                  { value: 'full', label: 'Full Width' }
                ]}
              />
            </div>

            {/* Live Preview */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu mărimea selectată:</p>
              <Button onClick={() => setShowModal(true)}>
                Deschide Modal ({selectedModalSize})
              </Button>
            </div>

            {/* All Sizes Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate mărimile disponibile:</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={() => { setSelectedModalSize('sm'); setShowModal(true); }}>
                  Small Modal
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedModalSize('md'); setShowModal(true); }}>
                  Medium Modal
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedModalSize('lg'); setShowModal(true); }}>
                  Large Modal
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedModalSize('xl'); setShowModal(true); }}>
                  XL Modal
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedModalSize('full'); setShowModal(true); }}>
                  Full Modal
                </Button>
              </div>
            </div>

            {/* Modal Instance */}
            <AnimatedModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title={`Modal Preview - ${selectedModalSize.toUpperCase()}`}
              size={selectedModalSize}
            >
              <p className="text-gray-600 dark:text-gray-300">
                Acesta este un dialog modal cu mărimea <strong>{selectedModalSize}</strong>.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Modal-ul include animații smooth și efect de blur pe fundal.
              </p>
              <ModalFooter>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Anulează
                </Button>
                <Button variant="primary" onClick={() => setShowModal(false)}>
                  Confirmă
                </Button>
              </ModalFooter>
            </AnimatedModal>
          </div>
        )

      case 'AnimatedTabs':
        return (
          <div className="space-y-6">
            {/* Variant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selectează Stilul Tabs
              </label>
              <Select
                value={selectedTabVariant}
                onChange={(e) => setSelectedTabVariant(e.target.value as any)}
                options={[
                  { value: 'default', label: 'Default' },
                  { value: 'pills', label: 'Pills' },
                  { value: 'underline', label: 'Underline' }
                ]}
              />
            </div>

            {/* Live Preview with Selected Variant */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu stilul selectat:</p>
              <AnimatedTabs
                variant={selectedTabVariant}
                tabs={[
                  {
                    id: 'tab1',
                    label: 'Primul Tab',
                    icon: <span>📋</span>,
                    content: (
                      <TabPanel>
                        <p>Conținut pentru primul tab cu stilul <strong>{selectedTabVariant}</strong></p>
                      </TabPanel>
                    )
                  },
                  {
                    id: 'tab2',
                    label: 'Al Doilea Tab',
                    icon: <span>⚙️</span>,
                    content: (
                      <TabPanel>
                        <p>Conținut pentru al doilea tab</p>
                      </TabPanel>
                    )
                  },
                  {
                    id: 'tab3',
                    label: 'Al Treilea Tab',
                    icon: <span>📊</span>,
                    content: (
                      <TabPanel>
                        <p>Conținut pentru al treilea tab</p>
                      </TabPanel>
                    )
                  }
                ]}
              />
            </div>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate stilurile disponibile:</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Click pe butoane pentru a schimba stilul preview-ului de mai sus</p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant={selectedTabVariant === 'default' ? 'primary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedTabVariant('default')}
                >
                  Default Style
                </Button>
                <Button 
                  variant={selectedTabVariant === 'pills' ? 'primary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedTabVariant('pills')}
                >
                  Pills Style
                </Button>
                <Button 
                  variant={selectedTabVariant === 'underline' ? 'primary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedTabVariant('underline')}
                >
                  Underline Style
                </Button>
              </div>
            </div>
          </div>
        )

      case 'AnimatedLoader':
        return (
          <div className="space-y-6">
            {/* Variant Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Tipul Loader
                </label>
                <Select
                  value={selectedLoaderVariant}
                  onChange={(e) => setSelectedLoaderVariant(e.target.value as any)}
                  options={[
                    { value: 'spinner', label: 'Spinner' },
                    { value: 'dots', label: 'Dots' },
                    { value: 'bars', label: 'Bars' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selectează Mărimea
                </label>
                <Select
                  value={selectedLoaderSize}
                  onChange={(e) => setSelectedLoaderSize(e.target.value as any)}
                  options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' }
                  ]}
                />
              </div>
            </div>

            {/* Live Preview with Selected Variant */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Preview cu varianta selectată:</p>
              <div className="flex flex-col items-center space-y-4">
                <AnimatedLoader size={selectedLoaderSize} variant={selectedLoaderVariant} />
                <AnimatedLoader size={selectedLoaderSize} variant={selectedLoaderVariant} text="Se încarcă..." />
              </div>
            </div>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate variantele:</p>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center space-y-4">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Spinner</p>
                  <AnimatedLoader size="sm" variant="spinner" />
                  <AnimatedLoader size="md" variant="spinner" />
                  <AnimatedLoader size="lg" variant="spinner" />
                </div>
                <div className="text-center space-y-4">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Dots</p>
                  <AnimatedLoader size="sm" variant="dots" />
                  <AnimatedLoader size="md" variant="dots" />
                  <AnimatedLoader size="lg" variant="dots" />
                </div>
                <div className="text-center space-y-4">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Bars</p>
                  <AnimatedLoader size="sm" variant="bars" />
                  <AnimatedLoader size="md" variant="bars" />
                  <AnimatedLoader size="lg" variant="bars" />
                </div>
              </div>
            </div>
          </div>
        )

      case 'Alert':
        return (
          <div className="space-y-6">
            {/* Variant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selectează Tipul Alert
              </label>
              <Select
                value={selectedAlertType}
                onChange={(e) => setSelectedAlertType(e.target.value as any)}
                options={[
                  { value: 'info', label: 'Info' },
                  { value: 'success', label: 'Success' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'error', label: 'Error' }
                ]}
              />
            </div>

            {/* Live Preview with Selected Variant */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu tipul selectat:</p>
              <Alert 
                type={selectedAlertType} 
                title={`${selectedAlertType.charAt(0).toUpperCase() + selectedAlertType.slice(1)} Alert`}
                message={`Acesta este un mesaj de tip ${selectedAlertType}. Poate fi dismissible sau nu.`}
                dismissible 
              />
            </div>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate tipurile de alerte:</p>
              <div className="space-y-3">
                <Alert type="info" title="Informație" message="Acesta este un alert informațional" />
                <Alert type="success" title="Succes!" message="Operațiunea a fost completată cu succes" />
                <Alert type="warning" title="Avertizare" message="Te rugăm să verifici înainte de a continua" />
                <Alert type="error" title="Eroare" message="Ceva nu a funcționat corect" dismissible />
              </div>
            </div>
          </div>
        )

      case 'AnimatedTooltip':
        return (
          <div className="flex gap-4 items-center justify-center py-8">
            <AnimatedTooltip content="This is a tooltip!">
              <Button variant="outline">Hover me</Button>
            </AnimatedTooltip>
            <AnimatedTooltip content="Another tooltip with longer text that wraps">
              <span className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer">
                Hover over this element
              </span>
            </AnimatedTooltip>
          </div>
        )

      case 'ThemeSwitcher':
        return (
          <div className="space-y-6">
            {/* Variant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selectează Stilul Theme Switcher
              </label>
              <Select
                value={selectedThemeVariant}
                onChange={(e) => setSelectedThemeVariant(e.target.value as any)}
                options={[
                  { value: 'dropdown', label: 'Dropdown' },
                  { value: 'toggle', label: 'Toggle' },
                  { value: 'buttons', label: 'Buttons' }
                ]}
              />
            </div>

            {/* Live Preview with Selected Variant */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu stilul selectat:</p>
              <div className="flex justify-center">
                <ThemeSwitcher variant={selectedThemeVariant} />
              </div>
            </div>

            {/* All Variants Display */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Toate stilurile disponibile:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dropdown:</p>
                  <ThemeSwitcher variant="dropdown" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Toggle:</p>
                  <ThemeSwitcher variant="toggle" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Buttons:</p>
                  <ThemeSwitcher variant="buttons" />
                </div>
              </div>
            </div>
          </div>
        )

      case 'StaggerChildren':
        return (
          <StaggerChildren className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                className="p-4 bg-primary/10 rounded-lg text-center"
              >
                Item {i}
              </motion.div>
            ))}
          </StaggerChildren>
        )

      case 'ConnectionStatus':
        return (
          <div className="flex flex-col gap-4 items-start">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Component shows real-time connection status
            </p>
            <ConnectionStatus />
          </div>
        )

      case 'TypingIndicator':
        return (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <TypingIndicator />
          </div>
        )

      case 'MessageItem':
        return (
          <div className="space-y-3">
            <MessageItem
              message={{
                id: '1',
                content: 'Hello! This is a user message.',
                role: 'user',
                timestamp: new Date(),
                agent: 'user'
              }}
              isOwn={true}
            />
            <MessageItem
              message={{
                id: '2',
                content: 'This is an assistant response with helpful information.',
                role: 'assistant',
                timestamp: new Date(),
                agent: '00z'
              }}
              isOwn={false}
            />
          </div>
        )

      case 'DetailCard':
        return (
          <div className="space-y-6">
            {/* Preview Examples */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Exemple de DetailCard cu conținut diferit:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailCard title="Informații Sistem">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Versiune</span>
                      <span className="font-semibold">2.1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ultimul update</span>
                      <span className="font-semibold">Acum 2 ore</span>
                    </div>
                  </div>
                </DetailCard>

                <DetailCard title="Statistici">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">1,234</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total utilizatori</div>
                  </div>
                </DetailCard>
              </div>
            </div>
          </div>
        )

      case 'TagList':
        return (
          <div className="space-y-6">
            {/* All Variants Display */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Toate variantele cu contrast optimizat:</h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default variant (WCAG AA compliant):</p>
                  <TagList items={['Dashboard', 'Settings', 'Profile', 'Analytics', 'Reports']} />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary variant:</p>
                  <TagList items={['primary', 'secondary', 'outline', 'ghost', 'destructive']} variant="primary" />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code variant (mono font):</p>
                  <TagList items={['onClick', 'variant', 'size', 'disabled', 'loading']} variant="code" />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Variante colorate:</p>
                  <div className="space-y-2">
                    <TagList items={['Success', 'Completed', 'Active']} variant="success" />
                    <TagList items={['Warning', 'Pending', 'Review']} variant="warning" />
                    <TagList items={['Error', 'Failed', 'Critical']} variant="error" />
                    <TagList items={['Info', 'Notice', 'Update']} variant="info" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interactive Examples */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tag-uri interactive:</h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Click pe tag-uri pentru acțiuni:</p>
                  <TagList 
                    items={['Add Filter', 'Remove Filter', 'Clear All']} 
                    variant="primary"
                    interactive
                    onTagClick={(tag) => alert(`Clicked: ${tag}`)}
                  />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tag-uri de navigație:</p>
                  <TagList 
                    items={['Home', 'Products', 'About', 'Contact']} 
                    variant="default"
                    interactive
                    onTagClick={(tag) => console.log(`Navigate to: ${tag}`)}
                  />
                </div>
              </div>
            </div>
            
            {/* Size Variations */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Dimensiuni disponibile:</h4>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Small (sm):</p>
                  <TagList items={['React', 'TypeScript', 'Tailwind']} size="sm" />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medium (md) - default:</p>
                  <TagList items={['React', 'TypeScript', 'Tailwind']} size="md" />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Large (lg):</p>
                  <TagList items={['React', 'TypeScript', 'Tailwind']} size="lg" />
                </div>
              </div>
            </div>
            
            {/* Real-world Examples */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Exemple din aplicație:</h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tehnologii folosite:</p>
                  <TagList 
                    items={['React 18', 'TypeScript 5', 'Tailwind CSS', 'Framer Motion', 'Zustand']} 
                    variant="code"
                    size="sm"
                  />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status proiect:</p>
                  <div className="flex gap-4">
                    <TagList items={['In Development']} variant="warning" />
                    <TagList items={['2 Bugs']} variant="error" />
                    <TagList items={['85% Complete']} variant="success" />
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categorii componente:</p>
                  <TagList 
                    items={['UI Components', 'Layout', 'Forms', 'Data Display', 'Feedback']} 
                    variant="default"
                    interactive
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'FeatureList':
        return (
          <div className="space-y-6">
            {/* Examples */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">FeatureList cu și fără animații:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Fără animații:</h4>
                  <FeatureList features={[
                    'Layout responsive',
                    'Dark mode support',
                    'Accessibility compliant',
                    'Fast performance'
                  ]} />
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Cu animații:</h4>
                  <FeatureList 
                    features={[
                      'Animații smooth',
                      'Stagger children effects',
                      'Interactive hover states',
                      'Loading transitions'
                    ]} 
                    animate 
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'InfoGrid':
        return (
          <div className="space-y-6">
            {/* Examples */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">InfoGrid pentru afișarea datelor:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Statistici Utilizatori:</h4>
                  <InfoGrid items={[
                    { label: 'Total Users', value: '1,234' },
                    { label: 'Active Today', value: '89', valueClassName: 'text-green-600' },
                    { label: 'New This Week', value: '23', valueClassName: 'text-blue-600' },
                    { label: 'Bounce Rate', value: '12%', valueClassName: 'text-yellow-600' }
                  ]} />
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Performance Metrici:</h4>
                  <InfoGrid items={[
                    { label: 'Response Time', value: '120ms', valueClassName: 'text-green-600' },
                    { label: 'Uptime', value: '99.9%', valueClassName: 'text-green-600' },
                    { label: 'Error Rate', value: '0.1%', valueClassName: 'text-red-600' },
                    { label: 'Memory Usage', value: '45%' }
                  ]} />
                </div>
              </div>
            </div>
          </div>
        )

      case 'SectionCard':
        return (
          <div className="space-y-6">
            {/* Examples */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">SectionCard cu diferite configurații:</p>
              
              <div className="space-y-4">
                <SectionCard title="Dashboard Overview" icon="📊">
                  <p className="text-gray-600 dark:text-gray-300">
                    Aceasta este o secțiune cu icon și conținut simplu.
                  </p>
                </SectionCard>

                <SectionCard 
                  title="User Management" 
                  icon="👥"
                  actions={
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Export</Button>
                      <Button variant="primary" size="sm">Add User</Button>
                    </div>
                  }
                >
                  <InfoGrid items={[
                    { label: 'Total Users', value: '1,234' },
                    { label: 'Active Today', value: '89' },
                    { label: 'Pending Invites', value: '12' }
                  ]} />
                </SectionCard>

                <SectionCard title="Recent Activity">
                  <FeatureList features={[
                    'User John Doe logged in',
                    'New component created: Button',
                    'Settings updated by Admin',
                    'Backup completed successfully'
                  ]} />
                </SectionCard>
              </div>
            </div>
          </div>
        )

      case 'AccessibleCard':
        return (
          <div className="space-y-6">
            {/* Contrast Comparison */}
            <div className="space-y-4">
              <h4 className="font-medium">Comparație contrast - Normal vs High Contrast:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Normal Contrast */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Normal contrast:</p>
                  <AccessibleCard variant="default" contrast="normal">
                    <AccessibleCardContent>
                      <AccessibleCardHeader icon="🎯" contrast="normal">
                        <AccessibleCardTitle contrast="normal">Normal Contrast Card</AccessibleCardTitle>
                      </AccessibleCardHeader>
                      <AccessibleCardDescription contrast="normal">
                        Acesta este un card cu contrast normal, optim pentru majoritatea utilizatorilor.
                      </AccessibleCardDescription>
                      <div className="flex gap-2 mt-3">
                        <AccessibleCardBadge variant="primary" contrast="normal">Primary</AccessibleCardBadge>
                        <AccessibleCardBadge variant="success" contrast="normal">Success</AccessibleCardBadge>
                      </div>
                      <AccessibleCardFooter contrast="normal">
                        <span>Updated 2h ago</span>
                        <span>5.2:1 contrast ratio</span>
                      </AccessibleCardFooter>
                    </AccessibleCardContent>
                  </AccessibleCard>
                </div>

                {/* High Contrast */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">High contrast:</p>
                  <AccessibleCard variant="default" contrast="high">
                    <AccessibleCardContent>
                      <AccessibleCardHeader icon="🎯" contrast="high">
                        <AccessibleCardTitle contrast="high">High Contrast Card</AccessibleCardTitle>
                      </AccessibleCardHeader>
                      <AccessibleCardDescription contrast="high">
                        Acesta este un card cu contrast mare, perfect pentru accesibilitate sporită.
                      </AccessibleCardDescription>
                      <div className="flex gap-2 mt-3">
                        <AccessibleCardBadge variant="primary" contrast="high">Primary</AccessibleCardBadge>
                        <AccessibleCardBadge variant="success" contrast="high">Success</AccessibleCardBadge>
                      </div>
                      <AccessibleCardFooter contrast="high">
                        <span>Updated 2h ago</span>
                        <span>7.1:1 contrast ratio</span>
                      </AccessibleCardFooter>
                    </AccessibleCardContent>
                  </AccessibleCard>
                </div>
              </div>
            </div>

            {/* All Variants */}
            <div>
              <h4 className="font-medium mb-4">Toate variantele:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AccessibleCard variant="default" aria-label="Default card example">
                  <AccessibleCardContent>
                    <AccessibleCardTitle>Default Card</AccessibleCardTitle>
                    <AccessibleCardDescription>Card implicit cu shadow subtil</AccessibleCardDescription>
                  </AccessibleCardContent>
                </AccessibleCard>

                <AccessibleCard variant="interactive" onClick={() => alert('Card clicked!')} aria-label="Interactive card example">
                  <AccessibleCardContent>
                    <AccessibleCardTitle>Interactive Card</AccessibleCardTitle>
                    <AccessibleCardDescription>Card cu hover effects și focus states</AccessibleCardDescription>
                  </AccessibleCardContent>
                </AccessibleCard>

                <AccessibleCard variant="outline">
                  <AccessibleCardContent>
                    <AccessibleCardTitle>Outline Card</AccessibleCardTitle>
                    <AccessibleCardDescription>Card cu border pronunțat</AccessibleCardDescription>
                  </AccessibleCardContent>
                </AccessibleCard>

                <AccessibleCard variant="elevated">
                  <AccessibleCardContent>
                    <AccessibleCardTitle>Elevated Card</AccessibleCardTitle>
                    <AccessibleCardDescription>Card cu shadow pronunțată și lift effect</AccessibleCardDescription>
                  </AccessibleCardContent>
                </AccessibleCard>
              </div>
            </div>

            {/* Accessibility Features Demo */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                ♿ Funcții de accesibilitate:
              </h5>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Keyboard navigation:</strong> Tab pentru focalizare, Enter/Space pentru activare</li>
                <li>• <strong>Screen readers:</strong> Etichete ARIA și roluri semantice</li>
                <li>• <strong>Contrast ratios:</strong> WCAG AA compliant (4.5:1+ pentru text normal)</li>
                <li>• <strong>Focus indicators:</strong> Ring vizibil pentru navigarea cu keyboard</li>
                <li>• <strong>High contrast mode:</strong> Contrast sporit pentru vizibilitate maximă</li>
              </ul>
            </div>
          </div>
        )

      case 'PreviewCard':
        return (
          <div className="space-y-6">
            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Problematic old version */}
              <div>
                <h4 className="font-medium mb-3 text-red-700 dark:text-red-300">❌ Problematic (old):</h4>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu contrast slab:</p>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Text cu contrast insuficient</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Contrast ratio: ~2.8:1 (FAIL)
                    </p>
                  </div>
                </div>
              </div>

              {/* Improved version */}
              <div>
                <h4 className="font-medium mb-3 text-green-700 dark:text-green-300">✅ Improved (new):</h4>
                <PreviewCard title="Preview cu contrast îmbunătățit:">
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded border dark:border-gray-600">
                    <p className="text-gray-800 dark:text-gray-100">Text cu contrast optim</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      Contrast ratio: ~7.2:1 (PASS)
                    </p>
                  </div>
                </PreviewCard>
              </div>
            </div>

            {/* Technical Details */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
                🔍 Îmbunătățiri tehnice:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800 dark:text-green-200">
                <div>
                  <strong>Background colors:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Light: <code>bg-white</code> (solid white)</li>
                    <li>• Dark: <code>dark:bg-gray-800</code> (solid dark)</li>
                  </ul>
                </div>
                <div>
                  <strong>Text colors:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Light: <code>text-gray-900</code> (high contrast)</li>
                    <li>• Dark: <code>dark:text-gray-100</code> (high contrast)</li>
                  </ul>
                </div>
                <div>
                  <strong>Border colors:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Light: <code>border-gray-300</code></li>
                    <li>• Dark: <code>dark:border-gray-600</code></li>
                  </ul>
                </div>
                <div>
                  <strong>Shadows:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Elevated variant cu shadow-lg</li>
                    <li>• Hover effects pentru depth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'PasswordInput':
        return (
          <div className="space-y-6 max-w-md">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Password input cu toggle vizibilitate:</h4>
              <PasswordInput
                label="Parolă"
                placeholder="Introdu parola"
                helperText="Minim 8 caractere"
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Cu indicator putere parolă:</h4>
              <PasswordInput
                label="Parolă nouă"
                placeholder="Alege o parolă puternică"
                strength={true}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Fără toggle (doar indicator):</h4>
              <PasswordInput
                label="Confirmă parola"
                placeholder="Reintrodu parola"
                showToggle={false}
                strength={true}
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Cu eroare:</h4>
              <PasswordInput
                label="Parolă"
                placeholder="••••••••"
                error="Parola nu îndeplinește cerințele de securitate"
              />
            </div>
          </div>
        )
        
      case 'FeatureToggle':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Feature toggles simple:</h4>
              <div className="space-y-3">
                <FeatureToggle
                  label="Notificări Push"
                  description="Primește notificări instant despre piață"
                  enabled={checkboxChecked}
                  onChange={setCheckboxChecked}
                  icon={<span className="text-xl">🔔</span>}
                />
                
                <FeatureToggle
                  label="Dark Mode"
                  description="Activează tema întunecată"
                  enabled={true}
                  onChange={() => {}}
                  icon={<span className="text-xl">🌙</span>}
                />
                
                <FeatureToggle
                  label="Auto-save"
                  description="Salvează automat modificările"
                  enabled={false}
                  onChange={() => {}}
                  icon={<span className="text-xl">💾</span>}
                />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Fără icon sau descriere:</h4>
              <FeatureToggle
                label="Mod Expert"
                enabled={false}
                onChange={() => {}}
              />
            </div>
          </div>
        )
        
      case 'StatCard':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Stat cards cu trend indicators:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Utilizatori"
                  value="1,234"
                  change={{ value: 12.5, type: 'increase' }}
                  icon={<span className="text-2xl">👥</span>}
                  description="vs. luna trecută"
                />
                
                <StatCard
                  title="Conversii"
                  value="89.3%"
                  change={{ value: -2.4, type: 'decrease' }}
                  icon={<span className="text-2xl">📈</span>}
                  variant="warning"
                />
                
                <StatCard
                  title="Revenue"
                  value="$45,678"
                  change={{ value: 0, type: 'neutral' }}
                  icon={<span className="text-2xl">💰</span>}
                  variant="success"
                />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Variante colorate:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  title="Default"
                  value="123"
                  variant="default"
                />
                
                <StatCard
                  title="Primary"
                  value="456"
                  variant="primary"
                />
                
                <StatCard
                  title="Success"
                  value="789"
                  variant="success"
                />
                
                <StatCard
                  title="Error"
                  value="404"
                  variant="error"
                />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Fără icon sau change indicator:</h4>
              <StatCard
                title="Simple Stat"
                value="42"
                description="Just a number"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Preview not available for this component</p>
            <p className="text-sm mt-2">Component: {componentName}</p>
          </div>
        )
    }
  }

  return (
    <PreviewCard title="Live Preview:">
      {renderPreview()}
    </PreviewCard>
  )
}