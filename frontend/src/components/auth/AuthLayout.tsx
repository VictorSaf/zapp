import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { AuthPageTransition } from '../animations/PageTransition';
import { ToastProvider } from '../ui/Toast';

interface AuthLayoutProps {
  onAuthSuccess?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-60 h-60 bg-accent/10 rounded-full"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative w-full max-w-md">
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-8"
          >
            <motion.h1
              className="text-4xl font-bold text-primary mb-2"
              animate={{
                textShadow: [
                  '0 0 0px #1a365d',
                  '0 0 20px #1a365d20',
                  '0 0 0px #1a365d',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              ZAEUS
            </motion.h1>
            <p className="text-muted-foreground">
              Asistentul tău AI pentru trading
            </p>
          </motion.div>

          {/* Form Container */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -300, rotateY: -90 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: 300, rotateY: 90 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <LoginForm 
                    onToggleForm={toggleForm} 
                    onSuccess={onAuthSuccess}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 300, rotateY: 90 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -300, rotateY: -90 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <RegisterForm 
                    onToggleForm={toggleForm} 
                    onSuccess={onAuthSuccess}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center p-3 rounded-lg bg-background/50 backdrop-blur-sm"
              >
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                  🤖
                </div>
                <span>AI Personal</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center p-3 rounded-lg bg-background/50 backdrop-blur-sm"
              >
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mb-2">
                  📊
                </div>
                <span>Analiză Avansată</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center p-3 rounded-lg bg-background/50 backdrop-blur-sm"
              >
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center mb-2">
                  🔒
                </div>
                <span>Securitate</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </ToastProvider>
  );
};