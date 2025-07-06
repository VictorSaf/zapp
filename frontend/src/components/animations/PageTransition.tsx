import { motion, AnimatePresence, MotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.05,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

const PageTransition = ({
  children,
  mode = 'wait',
  className = '',
}: PageTransitionProps) => {
  return (
    <AnimatePresence mode={mode}>
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Specific animation for auth pages
export const AuthPageTransition = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -100, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: 100, rotateY: 15 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

// Form field animations
export const FormFieldAnimation = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
};

// Loading skeleton animation
export const SkeletonLoader = ({ className = '', width = '100%', height = '20px' }: {
  className?: string;
  width?: string;
  height?: string;
}) => {
  return (
    <motion.div
      className={`bg-muted rounded ${className}`}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export default PageTransition;