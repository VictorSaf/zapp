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
    name: 'DetailCard',
    category: 'ui',
    description: 'Card standardizat pentru afișarea detaliilor și informațiilor structurate',
    props: ['title', 'children', 'className'],
    usedIn: ['ComponentShowcase', 'Settings', 'Dashboard'],
    features: [
      'Design consistent pentru secțiuni de detalii',
      'Titlu standardizat',
      'Suport pentru orice tip de conținut',
      'Folosit împreună cu TagList, InfoGrid, FeatureList'
    ],
    icon: '📋'
  },
  {
    name: 'TagList',
    category: 'data',
    description: 'Component profesional pentru afișarea de tag-uri cu contrast optimizat și interactivitate',
    props: ['items', 'variant', 'size', 'interactive', 'onTagClick', 'className'],
    usedIn: ['ComponentShowcase', 'Settings', 'ComponentDetailsPage'],
    features: [
      'Variante: default, primary, code, success, warning, error, info',
      'Trei dimensiuni: sm, md, lg',
      'Mod interactiv cu click handlers',
      'Contrast WCAG AA pentru toate variantele',
      'Border subtil pentru claritate vizuală',
      'Focus states pentru accesibilitate',
      'Animații smooth la hover și click'
    ],
    variants: ['default', 'primary', 'code', 'success', 'warning', 'error', 'info'],
    icon: '🏷️'
  },
  {
    name: 'FeatureList',
    category: 'data',
    description: 'Listă de caracteristici cu bullet points și animații opționale',
    props: ['features', 'animate', 'className'],
    usedIn: ['ComponentShowcase', 'Dashboard'],
    features: [
      'Bullet points colorate',
      'Animații opționale cu StaggerChildren',
      'Layout consistent pentru liste',
      'Suport pentru text lung'
    ],
    icon: '📝'
  },
  {
    name: 'InfoGrid',
    category: 'data',
    description: 'Grid pentru afișarea perechilor cheie-valoare în format tabelar',
    props: ['items', 'className'],
    usedIn: ['Dashboard', 'Settings'],
    features: [
      'Layout în două coloane',
      'Aliniere automată',
      'Stilizare customizabilă pentru valori',
      'Perfect pentru statistici și metrici'
    ],
    icon: '📊'
  },
  {
    name: 'SectionCard',
    category: 'layout',
    description: 'Card pentru secțiuni mari cu titlu, icon opțional și acțiuni',
    props: ['title', 'icon', 'children', 'actions', 'className'],
    usedIn: ['ComponentShowcase', 'Dashboard', 'Settings'],
    features: [
      'Header cu icon opțional',
      'Slot pentru acțiuni în header',
      'Titlu mai mare pentru secțiuni importante',
      'Layout flexibil pentru conținut complex'
    ],
    icon: '📑'
  },
  {
    name: 'AccessibleCard',
    category: 'ui',
    description: 'Card component optimizat pentru accesibilitate cu rapoarte de contrast WCAG AA',
    props: ['variant', 'padding', 'contrast', 'onClick', 'aria-label', 'role'],
    usedIn: ['ComponentPreview', 'Settings', 'Dashboard'],
    features: [
      'Contrast ratios WCAG AA compliant (4.5:1+)',
      'Mod high contrast pentru accesibilitate sporită',
      'Focus states îmbunătățite cu ring visible',
      'Suport pentru screen readers',
      'Navigare cu keyboard (Enter/Space)',
      'Semantic HTML cu heading levels',
      'Variante: default, interactive, outline, elevated'
    ],
    variants: ['default', 'interactive', 'outline', 'elevated'],
    icon: '♿'
  },
  {
    name: 'PreviewCard',
    category: 'ui',
    description: 'Card specializat pentru preview-uri de componente cu contrast îmbunătățit',
    props: ['title', 'children', 'className'],
    usedIn: ['ComponentPreview'],
    features: [
      'Background solid pentru contrast optim',
      'Text colors optimizate pentru legibilitate',
      'Border colors cu contrast îmbunătățit',
      'Semantic heading pentru title',
      'Shadow effects pentru depth perception',
      'Focus management pentru accesibilitate'
    ],
    icon: '🔍'
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
    description: 'Selector pentru tema aplicației cu iconuri SVG',
    props: ['variant', 'showLabel'],
    usedIn: ['Header', 'Dashboard'],
    features: [
      'Variante: dropdown, toggle, buttons',
      'Iconuri SVG în loc de emoji',
      'Persistare în localStorage',
      'Auto-detect system theme',
      'Smooth transitions',
      'Dropdown poziționat în header'
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
    description: 'Header sticky standardizat cu layout profesional',
    props: ['title', 'backTo', 'showThemeSwitcher', 'showAdminButton', 'showUserInfo'],
    usedIn: ['Dashboard', 'Settings', 'Chat'],
    features: [
      'Sticky positioning cu scroll effects',
      'ZAEUS + titlu pagină cu font faded',
      'User info cu icon SVG și prenume',
      'Butoane aliniate la extrema dreaptă',
      'Backdrop blur la scroll',
      'Click pe user pentru editare profil',
      'Responsive design optimizat'
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
  },
  {
    name: 'PasswordInput',
    category: 'form',
    description: 'Input specializat pentru parole cu toggle vizibilitate și indicator de putere',
    props: ['showToggle', 'strength', 'value', 'onChange', 'label', 'error'],
    usedIn: ['Register', 'Login', 'Settings'],
    features: [
      'Toggle vizibilitate parolă',
      'Indicator putere parolă (opțional)',
      'Integrare cu Input component',
      'Validare integrată',
      'Dark mode support',
      'Accesibilitate completă'
    ],
    icon: '🔐'
  },
  {
    name: 'FeatureToggle',
    category: 'form',
    description: 'Toggle switch animat pentru activare/dezactivare funcționalități',
    props: ['label', 'description', 'enabled', 'onChange', 'icon'],
    usedIn: ['Settings', 'Dashboard'],
    features: [
      'Animație smooth pentru switch',
      'Icon și descriere opționale',
      'Click pe întregul card',
      'Dark mode optimizat',
      'Motion animations',
      'Accesibilitate WCAG AA'
    ],
    icon: '🔄'
  },
  {
    name: 'StatCard',
    category: 'data',
    description: 'Card pentru afișare statistici cu animații și trend indicators',
    props: ['title', 'value', 'change', 'icon', 'description', 'variant'],
    usedIn: ['Dashboard', 'Analytics'],
    features: [
      'Trend indicators (creștere/scădere)',
      'Variante colorate pentru contexte diferite',
      'Animații pentru valori și schimbări',
      'Icon opțional cu animație',
      'Dark mode support',
      'Responsive design'
    ],
    variants: ['default', 'primary', 'success', 'warning', 'error'],
    icon: '📊'
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