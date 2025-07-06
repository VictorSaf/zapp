import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const { 
    isAuthenticated, 
    token, 
    user,
    refreshProfile,
    logout 
  } = useAuthStore();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // If we have a token stored but no user data, try to refresh
        if (token && !user) {
          await refreshProfile();
        }

        // Validate token if we have one
        if (token) {
          try {
            const response = await fetch('http://localhost:3000/api/auth/verify-token', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            const data = await response.json();
            
            if (!data.data?.valid) {
              // Token is invalid, logout
              await logout();
              setAuthStatus('invalid');
              
              // Show notification if user was on a protected route
              if (location.pathname !== '/auth' && location.pathname !== '/') {
                toast({
                  title: 'Sesiune expirată',
                  description: 'Te rugăm să te autentifici din nou.',
                  variant: 'warning',
                });
              }
            } else {
              setAuthStatus('valid');
            }
          } catch (error) {
            console.warn('Token validation failed:', error);
            setAuthStatus('invalid');
          }
        } else {
          setAuthStatus('invalid');
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthStatus('invalid');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [token, user, refreshProfile, logout, location.pathname, toast]);

  // Auto-logout on token expiry
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    // Set up periodic token validation (every 5 minutes)
    const validateInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/auth/verify-token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        
        if (!data.data?.valid) {
          await logout();
          
          toast({
            title: 'Sesiune expirată',
            description: 'Te rugăm să te autentifici din nou.',
            variant: 'warning',
          });
          
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.warn('Periodic token validation failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(validateInterval);
  }, [token, isAuthenticated, logout, navigate, toast]);

  // Handle auth state changes
  useEffect(() => {
    if (!isInitialized) return;

    const currentPath = location.pathname;
    const isAuthPage = currentPath === '/auth';
    const isPublicPage = ['/', '/about', '/features'].includes(currentPath);

    // Redirect logic based on auth status
    if (authStatus === 'valid' && isAuthenticated) {
      // User is authenticated
      if (isAuthPage) {
        // Redirect from auth page to dashboard
        const redirectTo = location.state?.from || '/dashboard';
        navigate(redirectTo, { replace: true });
      }
    } else if (authStatus === 'invalid' && !isPublicPage) {
      // User needs authentication for protected route
      if (!isAuthPage) {
        navigate('/auth', { 
          state: { from: currentPath },
          replace: true 
        });
      }
    }
  }, [authStatus, isAuthenticated, location.pathname, location.state, navigate, isInitialized]);

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-1">ZAEUS</h3>
            <p className="text-sm text-muted-foreground">
              Inițializare aplicație...
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthGuard;