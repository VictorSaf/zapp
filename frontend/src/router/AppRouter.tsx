import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from '../components/ui/Toast';
import AuthGuard from './AuthGuard';
import PrivateRoute from './PrivateRoute';
import Landing from '../pages/Landing';
import Dashboard from '../pages/Dashboard';
import Chat from '../pages/Chat';
import { AuthLayout } from '../components/auth/AuthLayout';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthGuard>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/" 
                element={<Landing />} 
              />
              
              {/* Auth Route */}
              <Route 
                path="/auth" 
                element={
                  <PublicRoute>
                    <AuthLayout onAuthSuccess={() => window.location.href = '/dashboard'} />
                  </PublicRoute>
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />

              <Route 
                path="/chat" 
                element={
                  <PrivateRoute>
                    <Chat />
                  </PrivateRoute>
                } 
              />

              {/* Email Verification Route */}
              <Route 
                path="/verify-email" 
                element={
                  <PrivateRoute requireVerified={false}>
                    <EmailVerificationPage />
                  </PrivateRoute>
                } 
              />

              {/* 404 Route */}
              <Route 
                path="/404" 
                element={<NotFoundPage />} 
              />

              {/* Catch-all redirect */}
              <Route 
                path="*" 
                element={<Navigate to="/404" replace />} 
              />
            </Routes>
          </AnimatePresence>
        </AuthGuard>
      </ToastProvider>
    </BrowserRouter>
  );
};

// Component for routes that should only be accessible to unauthenticated users
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This will be handled by AuthGuard's redirect logic
  return <>{children}</>;
};

// Email Verification Page Component
const EmailVerificationPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-md w-full bg-background rounded-lg border shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">📧</span>
        </div>
        
        <h1 className="text-2xl font-bold text-primary mb-4">
          Verifică-ți adresa de email
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Pentru a accesa toate funcționalitățile ZAEUS, te rugăm să îți verifici adresa de email.
          Verifică inbox-ul și spam-ul pentru email-ul de confirmare.
        </p>
        
        <div className="space-y-3">
          <button className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
            Retrimite email-ul de verificare
          </button>
          
          <button className="w-full px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
            Schimbă adresa de email
          </button>
        </div>
      </div>
    </div>
  );
};

// 404 Not Found Page Component
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="text-center">
        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🤖</span>
        </div>
        
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Pagina nu a fost găsită
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Agentul 00Z nu a putut localiza pagina căutată. 
          Poate a fost mutată sau nu există.
        </p>
        
        <div className="space-x-4">
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Înapoi
          </button>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Acasă
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppRouter;