import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Checkbox } from '../components/ui/Checkbox'
import { PageTransition } from '../components/animations'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { AnimatedTabs, TabPanel } from '../components/ui/AnimatedTabs'
import { AnimatedModal, ModalFooter } from '../components/ui/AnimatedModal'
import { AnimatedLoader } from '../components/ui/AnimatedLoader'
import { Alert } from '../components/ui/Alert'
import { StaggerChildren } from '../components/animations'
import { Header } from '../components/layout'
import { ComponentShowcase } from '../components/admin/ComponentShowcase'
import { cn } from '../utils/cn'

interface AgentConfig {
  name: string
  description: string
  friendly_model: string
  expert_model: string
  enabled: boolean
  icon?: string
}

interface AppSettings {
  app_name: string
  app_version: string
  maintenance_mode: boolean
  allow_registration: boolean
  require_email_verification: boolean
  session_timeout: number
  max_login_attempts: number
  ai_models: {
    default_model: string
    ollama_enabled: boolean
    openai_enabled: boolean
    claude_enabled: boolean
  }
  features: {
    chat_enabled: boolean
    analytics_enabled: boolean
    export_enabled: boolean
    community_enabled: boolean
  }
  limits: {
    max_conversations_per_user: number
    max_messages_per_conversation: number
    max_file_size_mb: number
  }
  agents?: {
    [key: string]: AgentConfig
  }
}

export const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [savedAlert, setSavedAlert] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is admin
    if (!isAuthenticated || !user?.is_admin) {
      navigate('/dashboard')
      return
    }

    // Fetch current settings
    fetchSettings()
  }, [isAuthenticated, user, navigate])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setSettings(data.data)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    
    try {
      setIsSaving(true)
      setError(null)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const data = await response.json()
      if (data.success) {
        setSavedAlert(true)
        setTimeout(() => setSavedAlert(false), 3000)
        // Refresh settings to get server response
        await fetchSettings()
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = (updates: Partial<AppSettings>) => {
    if (!settings) return
    setSettings({ ...settings, ...updates })
  }

  const updateNestedSettings = (path: string[], value: any) => {
    if (!settings) return
    
    const newSettings = { ...settings }
    let current: any = newSettings
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {}
      }
      current[path[i]] = { ...current[path[i]] }
      current = current[path[i]]
    }
    
    current[path[path.length - 1]] = value
    setSettings(newSettings)
  }

  const settingsTabs = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      content: (
        <TabPanel>
          <StaggerChildren className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Input
                label="Nume Aplicație"
                value={settings?.app_name || ''}
                onChange={(e) => updateSettings({ app_name: e.target.value })}
                className="transition-all duration-200"
              />
              <Input
                label="Versiune"
                value={settings?.app_version || ''}
                disabled
                className="transition-all duration-200"
              />
            </motion.div>
            
            <div className="space-y-4">
              <Checkbox
                label="Mod Mentenanță"
                checked={settings?.maintenance_mode || false}
                onChange={(e) => updateSettings({ maintenance_mode: e.target.checked })}
              />
              
              <Checkbox
                label="Permite Înregistrări Noi"
                checked={settings?.allow_registration || false}
                onChange={(e) => updateSettings({ allow_registration: e.target.checked })}
              />
              
              <Checkbox
                label="Verificare Email Obligatorie"
                checked={settings?.require_email_verification || false}
                onChange={(e) => updateSettings({ require_email_verification: e.target.checked })}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Timeout Sesiune (secunde)"
                value={settings?.session_timeout || 0}
                onChange={(e) => updateSettings({ session_timeout: parseInt(e.target.value) })}
              />
              <Input
                type="number"
                label="Încercări Maxime Login"
                value={settings?.max_login_attempts || 0}
                onChange={(e) => updateSettings({ max_login_attempts: parseInt(e.target.value) })}
              />
            </div>
          </StaggerChildren>
        </TabPanel>
      )
    },
    {
      id: 'features',
      label: 'Funcționalități',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      content: (
        <TabPanel>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Module Aplicație</h3>
            
            <label className="flex items-center justify-between p-4 border rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings?.features?.chat_enabled || false}
                  onChange={(e) => updateNestedSettings(['features', 'chat_enabled'], e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Chat AI</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Conversații cu agenții AI</p>
                </div>
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  settings?.features?.chat_enabled 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" 
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                )}
              >
                {settings?.features?.chat_enabled ? 'Activ' : 'Inactiv'}
              </motion.span>
            </label>
            
            <label className="flex items-center justify-between p-4 border rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings?.features?.analytics_enabled || false}
                  onChange={(e) => updateNestedSettings(['features', 'analytics_enabled'], e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Analytics</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Statistici și rapoarte detaliate</p>
                </div>
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  settings?.features?.analytics_enabled 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" 
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                )}
              >
                {settings?.features?.analytics_enabled ? 'Activ' : 'Inactiv'}
              </motion.span>
            </label>
            
            <label className="flex items-center justify-between p-4 border rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings?.features?.export_enabled || false}
                  onChange={(e) => updateNestedSettings(['features', 'export_enabled'], e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Export Date</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Export conversații și date</p>
                </div>
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  settings?.features?.export_enabled 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" 
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                )}
              >
                {settings?.features?.export_enabled ? 'Activ' : 'Inactiv'}
              </motion.span>
            </label>
            
            <label className="flex items-center justify-between p-4 border rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings?.features?.community_enabled || false}
                  onChange={(e) => updateNestedSettings(['features', 'community_enabled'], e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Comunitate</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Forum și discuții între utilizatori</p>
                </div>
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  settings?.features?.community_enabled 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" 
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                )}
              >
                {settings?.features?.community_enabled ? 'Activ' : 'Inactiv'}
              </motion.span>
            </label>
          </div>
        </TabPanel>
      )
    },
    {
      id: 'limits',
      label: 'Limite',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      content: (
        <TabPanel>
          <StaggerChildren className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Conversații per Utilizator"
                value={settings?.limits?.max_conversations_per_user || 0}
                onChange={(e) => updateNestedSettings(['limits', 'max_conversations_per_user'], parseInt(e.target.value))}
              />
              <Input
                type="number"
                label="Mesaje per Conversație"
                value={settings?.limits?.max_messages_per_conversation || 0}
                onChange={(e) => updateNestedSettings(['limits', 'max_messages_per_conversation'], parseInt(e.target.value))}
              />
            </div>
            
            <Input
              type="number"
              label="Dimensiune Maximă Fișier (MB)"
              value={settings?.limits?.max_file_size_mb || 0}
              onChange={(e) => updateNestedSettings(['limits', 'max_file_size_mb'], parseInt(e.target.value))}
            />
            
            <AnimatedCard variant="default" className="p-4 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">Despre Limite</p>
                  <p>Aceste limite ajută la protejarea resurselor și prevenirea abuzurilor. Valorile 0 înseamnă nelimitat.</p>
                </div>
              </div>
            </AnimatedCard>
          </StaggerChildren>
        </TabPanel>
      )
    },
    {
      id: 'agents',
      label: 'Agenți AI',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      content: (
        <TabPanel>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Configurare Agenți AI
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configurează modelele AI pe care le folosește fiecare agent în modul Friendly (conversațional) și Expert (tehnic).
            </p>
          </div>

          <StaggerChildren className="space-y-4">
            {settings?.agents && Object.entries(settings.agents).map(([key, agent], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AnimatedCard variant="hover" className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{agent.icon}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{agent.description}</p>
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agent.enabled}
                        onChange={(e) => {
                          updateNestedSettings(['agents', key, 'enabled'], e.target.checked)
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Activ</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Model pentru Modul Friendly"
                      value={agent.friendly_model}
                      onChange={(e) => {
                        updateNestedSettings(['agents', key, 'friendly_model'], e.target.value)
                      }}
                      disabled={!agent.enabled}
                      helperText="Model optimizat pentru conversații naturale și prietenoase"
                      groups={[
                        {
                          label: "Modele Locale (Ollama)",
                          options: [
                            { value: "llama2", label: "Llama 2" },
                            { value: "mistral", label: "Mistral" },
                            { value: "codellama", label: "Code Llama" },
                            { value: "phi", label: "Phi-2" },
                            { value: "neural-chat", label: "Neural Chat" }
                          ]
                        },
                        {
                          label: "Modele Cloud",
                          options: [
                            { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
                            { value: "gpt-4", label: "GPT-4" },
                            { value: "claude-2", label: "Claude 2" },
                            { value: "claude-3", label: "Claude 3" }
                          ]
                        }
                      ]}
                    />

                    <Select
                      label="Model pentru Modul Expert"
                      value={agent.expert_model}
                      onChange={(e) => {
                        updateNestedSettings(['agents', key, 'expert_model'], e.target.value)
                      }}
                      disabled={!agent.enabled}
                      helperText="Model avansat pentru analize tehnice și răspunsuri detaliate"
                      groups={[
                        {
                          label: "Modele Locale (Ollama)",
                          options: [
                            { value: "llama2", label: "Llama 2" },
                            { value: "mistral", label: "Mistral" },
                            { value: "codellama", label: "Code Llama" },
                            { value: "phi", label: "Phi-2" },
                            { value: "neural-chat", label: "Neural Chat" }
                          ]
                        },
                        {
                          label: "Modele Cloud Premium",
                          options: [
                            { value: "gpt-4", label: "GPT-4" },
                            { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
                            { value: "claude-3", label: "Claude 3" },
                            { value: "claude-3-opus", label: "Claude 3 Opus" }
                          ]
                        }
                      ]}
                    />
                  </div>

                  {!agent.enabled && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        ⚠️ Agentul este dezactivat. Utilizatorii nu vor putea interacționa cu acest agent.
                      </p>
                    </div>
                  )}

                  {agent.enabled && (agent.friendly_model.includes('gpt') || agent.expert_model.includes('gpt') || 
                                     agent.friendly_model.includes('claude') || agent.expert_model.includes('claude')) && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        💡 Acest agent folosește modele cloud care necesită API keys și pot genera costuri.
                      </p>
                    </div>
                  )}
                </AnimatedCard>
              </motion.div>
            ))}
          </StaggerChildren>

          <AnimatedCard variant="default" className="p-4 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">Despre Modele</p>
                <p>Modelele locale (Ollama) rulează pe serverul tău și nu au costuri suplimentare. Modelele cloud necesită API keys și pot genera costuri în funcție de utilizare.</p>
              </div>
            </div>
          </AnimatedCard>
        </TabPanel>
      )
    },
    {
      id: 'components',
      label: 'Interfață',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      content: (
        <TabPanel>
          <div className="space-y-4">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Biblioteca de Componente
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Explorează toate componentele UI folosite în aplicație, vezi unde sunt folosite și ce caracteristici au.
              </p>
            </div>
            
            <ComponentShowcase />
          </div>
        </TabPanel>
      )
    }
  ]

  // Don't render anything until user auth check is complete
  if (!isAuthenticated || !user?.is_admin) {
    return null
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header 
          title="Setări"
          backTo="/dashboard"
          backLabel="Dashboard"
          showThemeSwitcher={true}
          showAdminButton={false}
          showUserInfo={true}
          showLogout={true}
        />
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Save Button and Alert */}
          <div className="flex items-center justify-between mb-6">
            <div>
              {savedAlert && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-lg text-sm font-medium inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvat cu succes
                </motion.div>
              )}
            </div>
            
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSaving || isLoading || !settings}
              className="min-w-[160px]"
            >
              {isSaving ? (
                <span className="flex items-center space-x-2">
                  <AnimatedLoader size="sm" />
                  <span>Salvează...</span>
                </span>
              ) : (
                'Salvează Modificările'
              )}
            </Button>
          </div>
          {error && (
            <Alert
              type="error"
              title="Eroare"
              message={error}
              className="mb-6"
            />
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <AnimatedLoader size="lg" />
            </div>
          ) : settings ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <AnimatedCard className="p-6">
                <AnimatedTabs tabs={settingsTabs} variant="underline" />
              </AnimatedCard>
            </motion.div>
          ) : (
            <Alert
              type="error"
              title="Eroare"
              message="Nu s-au putut încărca setările"
            />
          )}
        </div>
        
        {/* Confirm Save Modal */}
        <AnimatedModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirmă Salvarea"
        >
          <p className="text-gray-600 dark:text-gray-200">
            Ești sigur că vrei să salvezi modificările? Acestea vor afecta toți utilizatorii aplicației.
          </p>
          
          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowConfirmModal(false)}
            >
              Anulează
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowConfirmModal(false)
                handleSaveSettings()
              }}
            >
              Salvează
            </Button>
          </ModalFooter>
        </AnimatedModal>
      </div>
    </PageTransition>
  )
}