import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Checkbox } from '../ui/Checkbox'
import { AnimatedCard } from '../ui/AnimatedCard'
import { AnimatedModal, ModalFooter } from '../ui/AnimatedModal'
import { AnimatedTabs, TabPanel } from '../ui/AnimatedTabs'
import { AnimatedLoader } from '../ui/AnimatedLoader'
import { Alert } from '../ui/Alert'
import { AnimatedTooltip } from '../ui/AnimatedTooltip'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { ScrollProgress } from '../ui/ScrollProgress'
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
  const [selectedCardVariant, setSelectedCardVariant] = React.useState<'default' | 'hover' | 'interactive'>('default')
  const [selectedCardAnimation, setSelectedCardAnimation] = React.useState<'fadeIn' | 'slideUp' | 'scaleIn'>('fadeIn')
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu varianta selectată:</p>
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
            </div>

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
                  value={selectedCardVariant}
                  onChange={(e) => setSelectedCardVariant(e.target.value as any)}
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
                  value={selectedCardAnimation}
                  onChange={(e) => setSelectedCardAnimation(e.target.value as any)}
                  options={[
                    { value: 'fadeIn', label: 'Fade In' },
                    { value: 'slideUp', label: 'Slide Up' },
                    { value: 'scaleIn', label: 'Scale In' }
                  ]}
                />
              </div>
            </div>

            {/* Live Preview with Selected Variant */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview cu varianta selectată:</p>
              <AnimatedCard variant={selectedCardVariant} animationType={selectedCardAnimation}>
                <div className="p-6">
                  <h3 className="font-semibold mb-2">Card cu {selectedCardVariant} / {selectedCardAnimation}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Acesta este un card cu varianta {selectedCardVariant} și animație {selectedCardAnimation}.
                    {selectedCardVariant === 'hover' && ' Treci cu mouse-ul peste card pentru efecte.'}
                    {selectedCardVariant === 'interactive' && ' Click pe card pentru interacțiune.'}
                  </p>
                </div>
              </AnimatedCard>
            </div>

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
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Live Preview:
      </h4>
      <div className="relative">
        {renderPreview()}
      </div>
    </div>
  )
}