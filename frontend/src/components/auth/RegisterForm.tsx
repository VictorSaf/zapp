import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { FormFieldAnimation } from '../animations/PageTransition';
import { useAuthStore } from '../../stores/authStore';

interface RegisterFormProps {
  onToggleForm?: () => void;
  onSuccess?: () => void;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  trading_experience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_markets: string[];
  risk_tolerance: 'low' | 'medium' | 'high';
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  first_name?: string;
  last_name?: string;
  general?: string;
}

const tradingExperiences = [
  { value: 'beginner', label: 'Începător' },
  { value: 'intermediate', label: 'Intermediar' },
  { value: 'advanced', label: 'Avansat' },
  { value: 'expert', label: 'Expert' },
];

const markets = [
  { value: 'forex', label: 'Forex' },
  { value: 'stocks', label: 'Acțiuni' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodities', label: 'Mărfuri' },
  { value: 'indices', label: 'Indici' },
];

const riskTolerances = [
  { value: 'low', label: 'Scăzut' },
  { value: 'medium', label: 'Mediu' },
  { value: 'high', label: 'Ridicat' },
];

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleForm, onSuccess }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    trading_experience: 'beginner',
    preferred_markets: [],
    risk_tolerance: 'medium',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { register } = useAuthStore();

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Parola trebuie să aibă minim 8 caractere';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = 'Parola trebuie să conțină: majusculă, minusculă, cifră și caracter special';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmarea parolei este obligatorie';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Parolele nu coincid';
    }

    // Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Prenumele este obligatoriu';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Numele este obligatoriu';
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
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        trading_experience: formData.trading_experience,
        preferred_markets: formData.preferred_markets,
        risk_tolerance: formData.risk_tolerance,
      });

      toast({
        title: 'Cont creat cu succes!',
        description: 'Bine ai venit în ZAEUS. Ești acum conectat.',
        variant: 'success',
      });

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'A apărut o eroare la înregistrare';
      
      setErrors({ general: errorMessage });
      
      toast({
        title: 'Eroare înregistrare',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleMarketChange = (market: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_markets: prev.preferred_markets.includes(market)
        ? prev.preferred_markets.filter(m => m !== market)
        : [...prev.preferred_markets, market]
    }));
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
              Creează cont
            </motion.h1>
            <p className="text-muted-foreground">
              Alătură-te comunității ZAEUS
            </p>
          </div>
        </FormFieldAnimation>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormFieldAnimation delay={0.3}>
              <Input
                type="text"
                label="Prenume"
                placeholder="Prenume"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                error={errors.first_name}
                disabled={isLoading}
                size="sm"
              />
            </FormFieldAnimation>
            
            <FormFieldAnimation delay={0.4}>
              <Input
                type="text"
                label="Nume"
                placeholder="Nume"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                error={errors.last_name}
                disabled={isLoading}
                size="sm"
              />
            </FormFieldAnimation>
          </div>

          {/* Email Field */}
          <FormFieldAnimation delay={0.5}>
            <Input
              type="email"
              label="Email"
              placeholder="nume@exemplu.com"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              disabled={isLoading}
              size="sm"
            />
          </FormFieldAnimation>

          {/* Password Fields */}
          <FormFieldAnimation delay={0.6}>
            <Input
              type="password"
              label="Parola"
              placeholder="Parola (min. 8 caractere)"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              disabled={isLoading}
              size="sm"
            />
          </FormFieldAnimation>

          <FormFieldAnimation delay={0.7}>
            <Input
              type="password"
              label="Confirmă parola"
              placeholder="Confirmă parola"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              disabled={isLoading}
              size="sm"
            />
          </FormFieldAnimation>

          {/* Trading Experience */}
          <FormFieldAnimation delay={0.8}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Experiența de tranzacționare</label>
              <select
                value={formData.trading_experience}
                onChange={handleInputChange('trading_experience')}
                disabled={isLoading}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {tradingExperiences.map(exp => (
                  <option key={exp.value} value={exp.value}>
                    {exp.label}
                  </option>
                ))}
              </select>
            </div>
          </FormFieldAnimation>

          {/* Submit Button */}
          <FormFieldAnimation delay={0.9}>
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
              size="sm"
              motionProps={{
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
              }}
            >
              {isLoading ? 'Se creează contul...' : 'Creează cont'}
            </Button>
          </FormFieldAnimation>

          {/* Toggle to Login */}
          <FormFieldAnimation delay={1.0}>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Ai deja un cont?{' '}
                <button
                  type="button"
                  onClick={onToggleForm}
                  disabled={isLoading}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Conectează-te
                </button>
              </p>
            </div>
          </FormFieldAnimation>
        </form>
      </div>
    </motion.div>
  );
};