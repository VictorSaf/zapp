import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { FormFieldAnimation } from '../animations/PageTransition';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormProps {
  onToggleForm?: () => void;
  onSuccess?: () => void;
}

interface LoginFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm, onSuccess }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember_me: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { login } = useAuthStore();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Parola este obligatorie';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Parola trebuie să aibă minim 6 caractere';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await login({
        email: formData.email,
        password: formData.password,
        remember_me: formData.remember_me,
      });

      toast({
        title: 'Autentificare reușită!',
        description: 'Bine ai revenit în ZAEUS.',
        variant: 'success',
      });

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'A apărut o eroare la autentificare';
      
      setErrors({ general: errorMessage });
      
      toast({
        title: 'Eroare autentificare',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'remember_me' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-background rounded-lg border shadow-lg p-8">
        {/* Header */}
        <FormFieldAnimation delay={0.1}>
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl font-bold text-primary mb-2"
            >
              Bine ai revenit
            </motion.h1>
            <p className="text-muted-foreground">
              Conectează-te la contul tău ZAEUS
            </p>
          </div>
        </FormFieldAnimation>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
            >
              <p className="text-sm text-destructive">{errors.general}</p>
            </motion.div>
          )}

          {/* Email Field */}
          <FormFieldAnimation delay={0.3}>
            <Input
              type="email"
              label="Email"
              placeholder="nume@exemplu.com"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              disabled={isLoading}
              motionProps={{
                whileFocus: { scale: 1.02 },
                transition: { duration: 0.2 }
              }}
            />
          </FormFieldAnimation>

          {/* Password Field */}
          <FormFieldAnimation delay={0.4}>
            <Input
              type="password"
              label="Parola"
              placeholder="Introdu parola"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              disabled={isLoading}
              motionProps={{
                whileFocus: { scale: 1.02 },
                transition: { duration: 0.2 }
              }}
            />
          </FormFieldAnimation>

          {/* Remember Me & Forgot Password */}
          <FormFieldAnimation delay={0.5}>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.remember_me}
                  onChange={handleInputChange('remember_me')}
                  disabled={isLoading}
                  className="rounded border-input focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-foreground">Ține-mă conectat</span>
              </label>
              
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
                disabled={isLoading}
              >
                Ai uitat parola?
              </button>
            </div>
          </FormFieldAnimation>

          {/* Submit Button */}
          <FormFieldAnimation delay={0.6}>
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
              motionProps={{
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
              }}
            >
              {isLoading ? 'Se conectează...' : 'Conectează-te'}
            </Button>
          </FormFieldAnimation>

          {/* Toggle to Register */}
          <FormFieldAnimation delay={0.7}>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Nu ai încă un cont?{' '}
                <button
                  type="button"
                  onClick={onToggleForm}
                  disabled={isLoading}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Înregistrează-te
                </button>
              </p>
            </div>
          </FormFieldAnimation>
        </form>
      </div>
    </motion.div>
  );
};