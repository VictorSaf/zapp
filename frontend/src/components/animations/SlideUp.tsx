import { motion, MotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface SlideUpProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  stagger?: boolean;
  staggerDelay?: number;
}

const SlideUp = ({
  children,
  delay = 0,
  duration = 0.4,
  distance = 30,
  stagger = false,
  staggerDelay = 0.1,
  ...motionProps
}: SlideUpProps) => {
  const slideUpVariants = {
    hidden: {
      y: distance,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration,
        ease: 'easeOut',
        delay: stagger ? undefined : delay,
      },
    },
  };

  const containerVariants = stagger
    ? {
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }
    : undefined;

  if (stagger) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        {...motionProps}
      >
        {Array.isArray(children)
          ? children.map((child, index) => (
              <motion.div key={index} variants={slideUpVariants}>
                {child}
              </motion.div>
            ))
          : children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={slideUpVariants}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

// Specialized component for form fields
export const SlideUpForm = ({ children }: { children: ReactNode }) => {
  return (
    <SlideUp stagger staggerDelay={0.1} delay={0.2}>
      {children}
    </SlideUp>
  );
};

// Specialized component for cards
export const SlideUpCard = ({ 
  children, 
  delay = 0,
  hover = true 
}: { 
  children: ReactNode; 
  delay?: number;
  hover?: boolean;
}) => {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={hover ? { y: -5, scale: 1.02 } : undefined}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default SlideUp;