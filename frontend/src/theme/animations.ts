// Animation variants for consistent animations across the app
export const animations = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: "easeInOut" }
  },

  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4 }
  },

  fadeInScale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  slideDown: {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  slideLeft: {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  slideRight: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  // Spring animations
  springScale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring", stiffness: 400, damping: 17 }
  },

  springRotate: {
    whileHover: { rotate: 5 },
    whileTap: { rotate: -5 },
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },

  // Stagger children
  staggerContainer: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  },

  // Modal animations
  modalOverlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },

  modalContent: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },

  // Tooltip animations
  tooltip: {
    initial: { opacity: 0, scale: 0.8, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: 10 },
    transition: { duration: 0.15 }
  },

  // Loading animations
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1]
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },

  spin: {
    animate: {
      rotate: 360
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  },

  // Skeleton loader
  skeleton: {
    animate: {
      backgroundPosition: ["200% 0", "-200% 0"]
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

// Gesture variants
export const gestures = {
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  },
  
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },

  drag: {
    scale: 1.05,
    transition: { duration: 0.2 }
  }
}

// Duration presets
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  verySlow: 0.8
}

// Easing functions
export const easings = {
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55]
}