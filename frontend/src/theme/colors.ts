// ZAEUS Color System with CSS variables
export const colors = {
  // Primary palette - Deep Blue
  primary: {
    50: 'hsl(214, 100%, 97%)',
    100: 'hsl(214, 95%, 93%)',
    200: 'hsl(213, 97%, 87%)',
    300: 'hsl(212, 96%, 78%)',
    400: 'hsl(213, 94%, 68%)',
    500: 'hsl(217, 91%, 60%)', // Main primary
    600: 'hsl(221, 83%, 53%)',
    700: 'hsl(224, 76%, 48%)',
    800: 'hsl(226, 71%, 40%)',
    900: 'hsl(226, 70%, 33%)',
    DEFAULT: 'hsl(217, 91%, 60%)'
  },

  // Secondary palette - Dark Gray
  secondary: {
    50: 'hsl(210, 20%, 98%)',
    100: 'hsl(220, 14%, 96%)',
    200: 'hsl(220, 13%, 91%)',
    300: 'hsl(216, 12%, 84%)',
    400: 'hsl(218, 11%, 65%)',
    500: 'hsl(220, 9%, 46%)',
    600: 'hsl(215, 14%, 34%)', // Main secondary
    700: 'hsl(217, 19%, 27%)',
    800: 'hsl(215, 28%, 17%)',
    900: 'hsl(221, 39%, 11%)',
    DEFAULT: 'hsl(215, 14%, 34%)'
  },

  // Accent palette - Orange
  accent: {
    50: 'hsl(33, 100%, 96%)',
    100: 'hsl(34, 100%, 92%)',
    200: 'hsl(32, 98%, 84%)',
    300: 'hsl(31, 97%, 72%)',
    400: 'hsl(27, 96%, 61%)',
    500: 'hsl(25, 95%, 53%)', // Main accent
    600: 'hsl(21, 90%, 48%)',
    700: 'hsl(17, 88%, 40%)',
    800: 'hsl(15, 79%, 34%)',
    900: 'hsl(15, 75%, 28%)',
    DEFAULT: 'hsl(25, 95%, 53%)'
  },

  // Semantic colors
  success: {
    light: 'hsl(142, 76%, 93%)',
    DEFAULT: 'hsl(142, 76%, 36%)',
    dark: 'hsl(142, 76%, 20%)'
  },

  warning: {
    light: 'hsl(45, 100%, 93%)',
    DEFAULT: 'hsl(45, 100%, 51%)',
    dark: 'hsl(45, 100%, 30%)'
  },

  error: {
    light: 'hsl(0, 86%, 93%)',
    DEFAULT: 'hsl(0, 84%, 60%)',
    dark: 'hsl(0, 84%, 40%)'
  },

  info: {
    light: 'hsl(208, 100%, 93%)',
    DEFAULT: 'hsl(208, 100%, 50%)',
    dark: 'hsl(208, 100%, 30%)'
  },

  // Neutral colors
  gray: {
    50: 'hsl(0, 0%, 98%)',
    100: 'hsl(0, 0%, 96%)',
    200: 'hsl(0, 0%, 91%)',
    300: 'hsl(0, 0%, 84%)',
    400: 'hsl(0, 0%, 65%)',
    500: 'hsl(0, 0%, 46%)',
    600: 'hsl(0, 0%, 34%)',
    700: 'hsl(0, 0%, 27%)',
    800: 'hsl(0, 0%, 17%)',
    900: 'hsl(0, 0%, 11%)'
  },

  // Background colors
  background: {
    primary: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(210, 20%, 98%)',
    tertiary: 'hsl(220, 14%, 96%)',
    inverse: 'hsl(215, 28%, 17%)'
  },

  // Text colors
  text: {
    primary: 'hsl(215, 28%, 17%)',
    secondary: 'hsl(220, 9%, 46%)',
    tertiary: 'hsl(218, 11%, 65%)',
    inverse: 'hsl(0, 0%, 100%)'
  },

  // Border colors
  border: {
    light: 'hsl(220, 13%, 91%)',
    DEFAULT: 'hsl(216, 12%, 84%)',
    dark: 'hsl(218, 11%, 65%)'
  }
}

// Dark mode colors (for future implementation)
export const darkColors = {
  background: {
    primary: 'hsl(215, 28%, 17%)',
    secondary: 'hsl(217, 19%, 27%)',
    tertiary: 'hsl(215, 14%, 34%)',
    inverse: 'hsl(0, 0%, 100%)'
  },

  text: {
    primary: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(220, 13%, 91%)',
    tertiary: 'hsl(216, 12%, 84%)',
    inverse: 'hsl(215, 28%, 17%)'
  },

  border: {
    light: 'hsl(215, 14%, 34%)',
    DEFAULT: 'hsl(217, 19%, 27%)',
    dark: 'hsl(221, 39%, 11%)'
  }
}