import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive: 'destructive group border-destructive bg-destructive text-destructive-foreground',
        success: 'border-success bg-success/10 text-success-foreground',
        warning: 'border-warning bg-warning/10 text-warning-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <ToastPrimitive.Root
        ref={ref}
        className={toastVariants({ variant, className })}
        {...props}
      />
    </motion.div>
  );
});

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
    {...props}
  />
));

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100"
    toast-close=""
    {...props}
  >
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.1 }}
    >
      <span className="sr-only">Close</span>
      ×
    </motion.div>
  </ToastPrimitive.Close>
));

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className="text-sm font-semibold [&+div]:text-xs"
    {...props}
  />
));

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className="text-sm opacity-90"
    {...props}
  />
));

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

// Toast Provider Component
const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastPrimitive.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
};

// Toast Hook
interface ToastState {
  toasts: Array<{
    id: string;
    title?: string;
    description?: string;
    action?: ToastActionElement;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
  }>;
}

const useToast = () => {
  const [state, setState] = React.useState<ToastState>({ toasts: [] });

  const toast = React.useCallback(
    (props: {
      title?: string;
      description?: string;
      action?: ToastActionElement;
      variant?: 'default' | 'destructive' | 'success' | 'warning';
    }) => {
      const id = Math.random().toString();
      setState((prev) => ({
        toasts: [...prev.toasts, { id, ...props }],
      }));

      // Auto remove after 5 seconds
      setTimeout(() => {
        setState((prev) => ({
          toasts: prev.toasts.filter((t) => t.id !== id),
        }));
      }, 5000);
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setState((prev) => ({
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
};

Toast.displayName = ToastPrimitive.Root.displayName;
ToastAction.displayName = ToastPrimitive.Action.displayName;
ToastClose.displayName = ToastPrimitive.Close.displayName;
ToastTitle.displayName = ToastPrimitive.Title.displayName;
ToastDescription.displayName = ToastPrimitive.Description.displayName;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
  useToast,
};