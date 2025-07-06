import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { SkeletonLoader } from '../components/animations/PageTransition';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerified?: boolean;
  fallbackPath?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireAuth = true,
  requireVerified = false,
  fallbackPath = '/auth',
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    user, 
    token, 
    isLoading, 
    refreshProfile 
  } = useAuthStore();
  
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      // If we have a token but no user data, try to refresh profile
      if (token && !user && requireAuth) {
        try {
          await refreshProfile();
        } catch (error) {
          console.warn('Failed to refresh profile:', error);
        }
      }
      setIsValidating(false);
    };

    validateAuth();
  }, [token, user, requireAuth, refreshProfile]);

  // Show loading state while validating
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="space-y-2 text-center">
            <SkeletonLoader width="120px" height="16px" className="mx-auto" />
            <SkeletonLoader width="80px" height="12px" className="mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground">
            Se încarcă ZAEUS...
          </p>
        </motion.div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ 
          from: location.pathname,
          message: 'Te rugăm să te autentifici pentru a accesa această pagină.'
        }} 
        replace 
      />
    );
  }

  // Check email verification requirement
  if (requireVerified && user && !user.email_verified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ 
          from: location.pathname,
          message: 'Te rugăm să îți verifici adresa de email pentru a continua.'
        }} 
        replace 
      />
    );
  }

  // Render children with page transition
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
};

export default PrivateRoute;