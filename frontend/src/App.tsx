import { BrowserRouter as Router } from 'react-router-dom'
import { AnimatedRoutes } from './components/AnimatedRoutes'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // Apply saved theme on app mount
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || 
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Router>
        <AnimatedRoutes />
      </Router>
    </div>
  )
}

export default App