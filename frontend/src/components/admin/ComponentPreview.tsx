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

  const renderPreview = () => {
    switch (componentName) {
      case 'Button':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="md">Primary Button</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="outline" size="md">Outline</Button>
              <Button variant="ghost" size="md">Ghost</Button>
              <Button variant="destructive" size="md">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="primary" loading>Loading</Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatedCard variant="default" animationType="fadeIn">
              <div className="p-4">
                <h3 className="font-semibold mb-2">Default Card</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Basic card with fade in animation
                </p>
              </div>
            </AnimatedCard>
            <AnimatedCard variant="hover" animationType="slideUp">
              <div className="p-4">
                <h3 className="font-semibold mb-2">Hover Card</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Card with hover effects and slide up
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
        )

      case 'AnimatedModal':
        return (
          <div>
            <Button onClick={() => setShowModal(true)}>
              Open Modal Preview
            </Button>
            <AnimatedModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title="Modal Preview"
              size="md"
            >
              <p className="text-gray-600 dark:text-gray-300">
                This is a modal dialog with animations and backdrop blur effect.
              </p>
              <ModalFooter>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setShowModal(false)}>
                  Confirm
                </Button>
              </ModalFooter>
            </AnimatedModal>
          </div>
        )

      case 'AnimatedTabs':
        return (
          <AnimatedTabs
            variant="pills"
            tabs={[
              {
                id: 'tab1',
                label: 'First Tab',
                icon: <span>📋</span>,
                content: (
                  <TabPanel>
                    <p>Content for the first tab with icon</p>
                  </TabPanel>
                )
              },
              {
                id: 'tab2',
                label: 'Second Tab',
                icon: <span>⚙️</span>,
                content: (
                  <TabPanel>
                    <p>Content for the second tab</p>
                  </TabPanel>
                )
              },
              {
                id: 'tab3',
                label: 'Third Tab',
                icon: <span>📊</span>,
                content: (
                  <TabPanel>
                    <p>Content for the third tab</p>
                  </TabPanel>
                )
              }
            ]}
          />
        )

      case 'AnimatedLoader':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <AnimatedLoader size="sm" variant="spinner" />
                <p className="text-sm mt-2">Small Spinner</p>
              </div>
              <div className="text-center">
                <AnimatedLoader size="md" variant="dots" />
                <p className="text-sm mt-2">Medium Dots</p>
              </div>
              <div className="text-center">
                <AnimatedLoader size="lg" variant="bars" />
                <p className="text-sm mt-2">Large Bars</p>
              </div>
            </div>
            <div>
              <AnimatedLoader size="md" variant="spinner" text="Loading data..." />
            </div>
          </div>
        )

      case 'Alert':
        return (
          <div className="space-y-3">
            <Alert type="info" title="Information" message="This is an informational alert" />
            <Alert type="success" title="Success!" message="Operation completed successfully" />
            <Alert type="warning" title="Warning" message="Please review before proceeding" />
            <Alert type="error" title="Error" message="Something went wrong" dismissible />
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
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Dropdown variant:</p>
              <ThemeSwitcher variant="dropdown" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Toggle variant:</p>
              <ThemeSwitcher variant="toggle" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Buttons variant:</p>
              <ThemeSwitcher variant="buttons" />
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