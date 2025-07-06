import * as React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
      },
      size: {
        default: 'h-10',
        sm: 'h-8 px-2 text-xs',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  motionProps?: MotionProps;
  error?: string;
  success?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, motionProps, error, success, label, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    // Determine variant based on error/success state
    const effectiveVariant = error ? 'error' : success ? 'success' : variant;

    const defaultMotionProps: MotionProps = {
      initial: { scale: 1 },
      whileFocus: { scale: 1.02 },
      transition: { duration: 0.2 },
    };

    const combinedMotionProps = {
      ...defaultMotionProps,
      ...motionProps,
    };

    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        
        <motion.input
          type={type}
          className={inputVariants({ variant: effectiveVariant, size, className })}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...combinedMotionProps}
          {...props}
        />
        
        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
        
        {/* Success Message */}
        {success && !error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-success"
          >
            {success}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };