import { useState } from 'react';
import HealthCheck from './components/HealthCheck';
import { useAuthStore } from './stores/authStore';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'health'>('home');
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">ZAEUS</h1>
              <span className="text-xs bg-accent-100 text-accent-800 px-2 py-1 rounded-full">
                v1.0-dev
              </span>
            </div>
            
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'home'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'health'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                System Health
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to ZAEUS
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Your AI-powered trading education platform. Learn, analyze, and improve your trading skills
                with personalized guidance from our multi-agent AI system.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">🧠</span>
                  </div>
                  <h3 className="font-semibold">AI Agents</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Interact with specialized AI agents for mentoring, analysis, and strategic guidance.
                </p>
              </div>

              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                    <span className="text-accent-600 font-semibold">📊</span>
                  </div>
                  <h3 className="font-semibold">Real-time Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your trading data and get instant insights and pattern recognition.
                </p>
              </div>

              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <span className="text-secondary-600 font-semibold">🎓</span>
                  </div>
                  <h3 className="font-semibold">Personalized Learning</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Adaptive education system that grows with your trading experience and style.
                </p>
              </div>
            </div>

            {/* Authentication Status */}
            <div className="card">
              <h3 className="font-semibold mb-3">Authentication Status</h3>
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-semibold">
                      {user.first_name[0]}{user.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-muted-foreground">Not authenticated</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary">
                Start Learning
              </button>
              <button className="btn-secondary">
                Upload Trading Data
              </button>
              <button className="btn-secondary">
                Chat with Agent 00Z
              </button>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Health</h2>
              <p className="text-gray-600">
                Monitor the status of ZAEUS backend services and infrastructure.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HealthCheck />
              
              <div className="card">
                <h3 className="font-semibold mb-3">Frontend Status</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse-slow"></div>
                  <div>
                    <p className="font-medium">React Application</p>
                    <p className="text-sm text-muted-foreground">Running on Vite Dev Server</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">React Version:</span>
                    <span className="font-mono">18.3.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TypeScript:</span>
                    <span className="font-mono">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tailwind CSS:</span>
                    <span className="font-mono">Configured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;