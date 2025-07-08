export interface ComponentInfo {
  name: string
  category: 'ui' | 'layout' | 'animation' | 'form' | 'data' | 'feedback'
  description: string
  props?: string[]
  usedIn: string[]
  features: string[]
  variants?: string[]
  icon?: string
}

export const componentRegistry: ComponentInfo[] = [
  // UI Components
  {
    name: 'Button',
    category: 'ui',
    description: 'Buton interactiv cu multiple variante și dimensiuni',
    props: ['variant', 'size', 'disabled', 'loading', 'onClick'],
    usedIn: ['Dashboard', 'Settings', 'Login', 'Register', 'Chat'],
    features: [
      'Variante: primary, secondary, outline, ghost, destructive',
      'Dimensiuni: sm, md, lg',
      'Loading state cu spinner',
      'Disabled state',
      'Animații hover și click cu Framer Motion'
    ],
    variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    icon: '🔘'
  },
  {
    name: 'Input',
    category: 'form',
    description: 'Câmp de input cu label, validare și mesaje de eroare',
    props: ['label', 'type', 'placeholder', 'error', 'helperText', 'disabled'],
    usedIn: ['Login', 'Register', 'Settings'],
    features: [
      'Label animat',
      'Validare în timp real',
      'Mesaje de eroare',
      'Helper text',
      'Suport pentru toate tipurile HTML5',
      'Dark mode support'
    ],
    icon: '📝'
  },
  {
    name: 'Select',
    category: 'form',
    description: 'Dropdown select cu grupare opțiuni și stilizare custom',
    props: ['label', 'options', 'groups', 'value', 'onChange', 'disabled'],
    usedIn: ['Settings'],
    features: [
      'Grupare opțiuni',
      'Label și helper text',
      'Disabled state',
      'Animații smooth',
      'Dark mode support'
    ],
    icon: '📋'
  },
  {
    name: 'Checkbox',
    category: 'form',
    description: 'Checkbox cu label și stilizare custom',
    props: ['label', 'checked', 'onChange', 'disabled'],
    usedIn: ['Settings'],
    features: [
      'Stilizare custom',
      'Label clickabil',
      'Disabled state',
      'Animație check'
    ],
    icon: '☑️'
  },
  {
    name: 'AnimatedCard',
    category: 'ui',
    description: 'Card cu animații de intrare și hover effects',
    props: ['variant', 'animationType', 'delay', 'className'],
    usedIn: ['Dashboard', 'Settings'],
    features: [
      'Variante: default, hover, interactive',
      'Animații: fadeIn, slideUp, slideDown, scaleIn',
      'Hover effects',
      'Shadow și border animat'
    ],
    variants: ['default', 'hover', 'interactive'],
    icon: '🎴'
  },
  {
    name: 'Card',
    category: 'ui',
    description: 'Card component flexibil cu sub-componente pentru structură complexă',
    props: ['variant', 'padding', 'onClick', 'className'],
    usedIn: ['Settings', 'Dashboard', 'ComponentShowcase'],
    features: [
      'Variante: default, interactive, outline',
      'Sub-componente: CardHeader, CardTitle, CardBadge, CardDescription, CardFooter',
      'Padding flexibil: none, sm, md, lg',
      'Motion animations pentru varianta interactivă',
      'Dark mode support',
      'Composable architecture'
    ],
    variants: ['default', 'interactive', 'outline'],
    icon: '🃏'
  },
  {
    name: 'AnimatedModal',
    category: 'feedback',
    description: 'Modal dialog cu backdrop și animații',
    props: ['isOpen', 'onClose', 'title', 'size', 'children'],
    usedIn: ['Dashboard', 'Settings'],
    features: [
      'Backdrop cu blur',
      'Animații enter/exit',
      'Dimensiuni: sm, md, lg, xl',
      'Close on escape/backdrop',
      'Focus trap'
    ],
    icon: '🪟'
  },
  {
    name: 'AnimatedTabs',
    category: 'ui',
    description: 'Tab-uri cu animație de tranziție între panouri',
    props: ['tabs', 'variant', 'defaultTab'],
    usedIn: ['Dashboard', 'Settings'],
    features: [
      'Variante: default, pills, underline',
      'Animație layout pentru indicator activ',
      'Icon support',
      'Keyboard navigation'
    ],
    variants: ['default', 'pills', 'underline'],
    icon: '📑'
  },
  {
    name: 'AnimatedLoader',
    category: 'feedback',
    description: 'Loading spinner cu multiple stiluri',
    props: ['size', 'variant', 'text', 'className'],
    usedIn: ['Dashboard', 'Settings', 'Chat'],
    features: [
      'Variante: spinner, dots, bars',
      'Dimensiuni: sm, md, lg',
      'Text opțional',
      'Skeleton loader variant'
    ],
    variants: ['spinner', 'dots', 'bars'],
    icon: '⏳'
  },
  {
    name: 'Alert',
    category: 'feedback',
    description: 'Mesaje de alertă cu diferite severități',
    props: ['type', 'title', 'message', 'dismissible'],
    usedIn: ['Settings', 'Login', 'Register'],
    features: [
      'Tipuri: info, success, warning, error',
      'Icon automat per tip',
      'Dismissible option',
      'Animație fade in/out'
    ],
    icon: '⚠️'
  },
  {
    name: 'AnimatedTooltip',
    category: 'feedback',
    description: 'Tooltip cu animații și poziționare automată',
    props: ['content', 'position', 'delay'],
    usedIn: ['Dashboard', 'Header'],
    features: [
      'Poziționare automată',
      'Delay hover',
      'Animație fade',
      'Dark mode support'
    ],
    icon: '💬'
  },
  {
    name: 'ThemeSwitcher',
    category: 'ui',
    description: 'Selector pentru tema aplicației',
    props: ['variant', 'showLabel'],
    usedIn: ['Header', 'Dashboard'],
    features: [
      'Variante: dropdown, toggle, buttons',
      'Persistare în localStorage',
      'Auto-detect system theme',
      'Smooth transitions'
    ],
    variants: ['dropdown', 'toggle', 'buttons'],
    icon: '🎨'
  },
  {
    name: 'ScrollProgress',
    category: 'ui',
    description: 'Indicator progres scroll pagină',
    props: ['height', 'color', 'position'],
    usedIn: ['Header'],
    features: [
      'Progress bar animat',
      'Sticky positioning',
      'Culoare customizabilă',
      'Performance optimized'
    ],
    icon: '📊'
  },
  {
    name: 'Header',
    category: 'layout',
    description: 'Header sticky standardizat cu scroll detection',
    props: ['title', 'backTo', 'showThemeSwitcher', 'showAdminButton', 'showUserInfo'],
    usedIn: ['Dashboard', 'Settings', 'Chat'],
    features: [
      'Sticky positioning',
      'Scroll detection pentru efecte',
      'Backdrop blur la scroll',
      'Slot pentru conținut custom',
      'Responsive design'
    ],
    icon: '🎯'
  },
  {
    name: 'PageTransition',
    category: 'animation',
    description: 'Wrapper pentru tranziții între pagini',
    props: ['children'],
    usedIn: ['Dashboard', 'Settings', 'Chat', 'Login', 'Register'],
    features: [
      'Animație fade și slide',
      'Exit animations',
      'Smooth transitions',
      'Preserve scroll position'
    ],
    icon: '🎬'
  },
  {
    name: 'ChatWindow',
    category: 'ui',
    description: 'Fereastră de chat cu suport pentru mesaje real-time',
    props: ['className'],
    usedIn: ['Chat'],
    features: [
      'WebSocket integration',
      'Auto-scroll la mesaje noi',
      'Typing indicators',
      'Connection status',
      'Offline queue support'
    ],
    icon: '💬'
  },
  {
    name: 'MessageList',
    category: 'data',
    description: 'Listă de mesaje cu animații stagger',
    props: ['messages'],
    usedIn: ['ChatWindow'],
    features: [
      'Stagger animations',
      'Avatar display',
      'Timestamp formatting',
      'Role-based styling'
    ],
    icon: '📜'
  },
  {
    name: 'ChatInput',
    category: 'form',
    description: 'Input pentru mesaje chat cu auto-resize',
    props: ['onSend', 'disabled'],
    usedIn: ['ChatWindow'],
    features: [
      'Auto-resize textarea',
      'Enter to send',
      'Emoji support',
      'File upload ready',
      'Character counter'
    ],
    icon: '⌨️'
  },
  {
    name: 'ConnectionStatus',
    category: 'feedback',
    description: 'Indicator status conexiune WebSocket',
    props: ['className'],
    usedIn: ['ChatWindow'],
    features: [
      'Real-time status',
      'Reconnect button',
      'Animated indicators',
      'Error states'
    ],
    icon: '🔌'
  },
  {
    name: 'TypingIndicator',
    category: 'feedback',
    description: 'Indicator animat pentru typing',
    props: ['user'],
    usedIn: ['ChatWindow'],
    features: [
      'Dot animation',
      'User display',
      'Auto-hide',
      'Smooth transitions'
    ],
    icon: '✍️'
  },
  {
    name: 'StaggerChildren',
    category: 'animation',
    description: 'Container pentru animații stagger pe copii',
    props: ['staggerDelay', 'className'],
    usedIn: ['Dashboard', 'Settings', 'MessageList'],
    features: [
      'Stagger delay customizabil',
      'Suport pentru orice element copil',
      'Performance optimized',
      'Smooth animations'
    ],
    icon: '🎭'
  }
]

export const getComponentsByCategory = (category: ComponentInfo['category']) => {
  return componentRegistry.filter(c => c.category === category)
}

export const getComponentByName = (name: string) => {
  return componentRegistry.find(c => c.name === name)
}

export const getComponentsUsedInPage = (pageName: string) => {
  return componentRegistry.filter(c => c.usedIn.includes(pageName))
}