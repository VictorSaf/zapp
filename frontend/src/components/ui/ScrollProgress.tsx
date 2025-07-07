import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export const ScrollProgress: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', updateScrollProgress)
    updateScrollProgress()

    return () => window.removeEventListener('scroll', updateScrollProgress)
  }, [])

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: scrollProgress / 100 }}
      transition={{ duration: 0.1 }}
      style={{ transformOrigin: '0% 0%' }}
    />
  )
}