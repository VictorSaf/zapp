/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ZAEUS Brand Colors
        primary: {
          DEFAULT: '#1a365d',
          50: '#f7fafc',
          100: '#edf2f7',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#a0aec0',
          500: '#718096',
          600: '#4a5568',
          700: '#2d3748',
          800: '#1a202c',
          900: '#1a365d',
        },
        secondary: {
          DEFAULT: '#2d3748',
          50: '#f7fafc',
          100: '#edf2f7',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#a0aec0',
          500: '#718096',
          600: '#4a5568',
          700: '#2d3748',
          800: '#1a202c',
          900: '#171923',
        },
        accent: {
          DEFAULT: '#ed8936',
          50: '#fffaf0',
          100: '#fef5e7',
          200: '#feebc8',
          300: '#fbd38d',
          400: '#f6ad55',
          500: '#ed8936',
          600: '#dd6b20',
          700: '#c05621',
          800: '#9c4221',
          900: '#7b341e',
        },
        success: {
          DEFAULT: '#38a169',
          50: '#f0fff4',
          100: '#c6f6d5',
          500: '#38a169',
          600: '#2f855a',
        },
        warning: {
          DEFAULT: '#d69e2e',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#d69e2e',
          600: '#b7791f',
        },
        destructive: {
          DEFAULT: '#e53e3e',
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#e53e3e',
          600: '#dc2626',
        },
        // Radix UI compatible colors
        background: '#ffffff',
        foreground: '#1a202c',
        muted: '#f7fafc',
        'muted-foreground': '#718096',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#1a365d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}