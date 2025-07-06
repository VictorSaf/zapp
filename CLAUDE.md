# 🤖 CLAUDE.md - Ghid pentru Agenții AI care Lucrează la ZAEUS

## 📖 Context Proiect

**ZAEUS** este un asistent educațional AI pentru traderi activi pe piețele financiare. Este o platformă hibridă care rulează local (Ollama) și cloud (GPT/Claude) cu focus pe experiență naturală și personalizată.

### Documentație Esențială
1. **z_app.md** - Documentul principal cu arhitectura completă
2. **app_flow.md** - Flow-ul UX și interacțiunile utilizator
3. **implementare.md** - Planul de implementare pas cu pas

## 🚨 METODOLOGIE DE DEZVOLTARE OBLIGATORIE

### Reguli Fundamentale
- ❌ **NU implementa mai mult de UN PAS odată**
- ❌ **NU treci la următorul pas fără confirmarea explicită a utilizatorului**
- ✅ **Testează complet fiecare pas înainte de a continua**
- ✅ **Actualizează implementare.md după fiecare pas completat**

### Workflow Obligatoriu
1. **Citește implementare.md** pentru următorul pas
2. **VERIFICĂ STRUCTURA** înainte de orice operațiune cu fișiere/directoare
3. **Implementează DOAR pasul curent**
4. **Testează funcționalitatea complet**
5. **Prezintă rezultatele utilizatorului**
6. **Așteaptă confirmarea pentru următorul pas**
7. **Marchează pasul ca IMPLEMENTAT cu timestamp**

### Format Raportare
```
✅ PAS X.Y - Numele Pasului
IMPLEMENTAT: [timestamp]
OBSERVAȚII: [ce a fost implementat]
TESTE: [ce teste au fost rulate și rezultat]
```

## 🏗️ Arhitectură Tehnică

### Stack Principal
- **Frontend:** React 19 + TypeScript + Tailwind CSS + Radix UI + Framer Motion
- **Backend:** Node.js + Express (2 microservicii)
  - API Service (port 3000) - auth, users, CRUD
  - AI Orchestrator (port 3001) - agenți AI, WebSocket
- **Database:** PostgreSQL cu column-level encryption
- **Cache:** Redis pentru sesiuni și context sharing
- **AI:** Ollama (local) + OpenAI/Claude (cloud)

### Componente Cheie
- **Agent 00Z** - Agentul central personal
- **Memory Context Protocol** - Sincronizare între agenți
- **Radix UI + Tailwind + Framer Motion** - Design system cu animații
- **WebSockets** - Chat real-time
- **Zustand** - State management

## 🎯 Principii de Design

1. **Experiență Naturală** - Nu corporate, nu școlar
2. **Privacy by Design** - Conversații encriptate
3. **Mobile-First** - PWA cu gesture support
4. **Accessibility** - WCAG compliant
5. **Performance** - Lazy loading, virtual scroll

## 🎨 UI Development Guidelines

### Radix UI Components
- **OBLIGATORIU** utilizează Radix UI pentru toate componentele de bază
- Form controls: `@radix-ui/react-form`, `@radix-ui/react-label`
- Navigation: `@radix-ui/react-navigation-menu`, `@radix-ui/react-tabs`
- Overlays: `@radix-ui/react-dialog`, `@radix-ui/react-toast`
- Data display: `@radix-ui/react-avatar`, `@radix-ui/react-badge`

### Framer Motion Animations
- **Page transitions:** Smooth enter/exit animations
- **Micro-interactions:** Button hover, focus states
- **Loading states:** Skeleton loaders cu animații
- **Form feedback:** Success/error state animations
- **Chat bubbles:** Typing indicators, message appearance

### Design Tokens
```typescript
// Culori ZAEUS
const colors = {
  primary: '#1a365d',    // Deep blue
  secondary: '#2d3748',  // Dark gray
  accent: '#ed8936',     // Orange
  success: '#38a169',    // Green
  warning: '#d69e2e',    // Yellow
  error: '#e53e3e'       // Red
}

// Animații standard
const animations = {
  fadeIn: { opacity: [0, 1], duration: 0.3 },
  slideUp: { y: [20, 0], opacity: [0, 1], duration: 0.4 },
  bounceIn: { scale: [0.8, 1.05, 1], duration: 0.5 }
}
```

### Component Structure
```
components/
├── ui/           # Radix UI wrapper components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Dialog.tsx
│   └── Toast.tsx
├── auth/         # Authentication components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── AuthLayout.tsx
└── animations/   # Framer Motion components
    ├── PageTransition.tsx
    ├── FadeIn.tsx
    └── SlideUp.tsx
```

## 🔐 Securitate

- Column-level encryption pentru conversații
- JWT + 2FA pentru Expert mode
- Rate limiting per endpoint
- GDPR compliance built-in
- Audit logs pentru acțiuni critice

## 🤖 Sistem Multi-Agent

### Agenți Disponibili
- **00Z** - Agent central personal
- **Mentor Agent** - Educație și ghidaj
- **Reporter Agent** - Știri și analize piață
- **Analyst Agent** - Procesare date trading
- **Strategist Agent** - Planificare și obiective

### Agent Orchestrator
- Coordonează toate interacțiunile
- Memory Context Protocol
- Fallback Expert → Prietenos
- Load balancing între modele

## 📊 Testing & Quality

### Teste Obligatorii per Pas
- **Unit Tests** pentru logica nouă
- **Integration Tests** pentru API endpoints
- **Smoke Tests** pentru flow-uri critice
- **Manual Testing** pentru UX

### Tools
- Jest pentru unit tests
- Supertest pentru API tests
- Cypress pentru E2E (implementat gradual)

## 🗂️ Structură Proiect

```
z_app/
├── docs/                    # Documentație
│   ├── z_app.md
│   ├── app_flow.md
│   └── implementare.md
├── backend/
│   ├── api-service/         # Port 3000
│   └── ai-orchestrator/     # Port 3001
├── frontend/
│   └── src/
│       ├── components/ui/   # Design System
│       ├── components/ai/   # AI Components
│       └── stores/          # Zustand stores
└── docker-compose.yml
```

## ⚡ Comenzi Rapide

```bash
# Setup complet
docker-compose up -d

# Frontend dev
cd frontend && npm run dev

# Backend API dev
cd backend/api-service && npm run dev

# Backend AI dev
cd backend/ai-orchestrator && npm run dev

# Teste
npm test

# Build production
npm run build
```

## 🚀 Getting Started pentru Noi Agenți

1. **Citește toate documentele** din docs/
2. **Verifică implementare.md** pentru statusul curent
3. **NU implementa nimic** fără să consulți planul
4. **Întreabă utilizatorul** care este următorul pas
5. **Urmează workflow-ul** pas cu pas

## 🔍 VERIFICĂRI OBLIGATORII ÎNAINTE DE OPERAȚIUNI

### ⚠️ CRITICAL: Prevenirea Duplicatelor de Directoare

**ÎNTOTDEAUNA verifică structura înainte de a crea sau modifica fișiere/directoare:**

```bash
# 1. Verifică directorul curent
pwd
ls -la

# 2. Verifică structura proiectului
ls -la /Users/victorsafta/work/z_app/

# 3. Verifică subdirectoarele specifice
ls -la backend/
ls -la frontend/

# 4. Pentru operațiuni în backend/api-service
ls -la backend/api-service/
# CAUTION: Verifică că NU există backend/api-service/backend/

# 5. Pentru operațiuni în frontend
ls -la frontend/
# CAUTION: Verifică că NU există frontend/frontend/
```

### Procedura Obligatorie Înainte de mkdir/touch/cp/mv

1. **`pwd`** - Confirmă directorul curent
2. **`ls -la`** - Verifică conținutul directorului
3. **Planifică calea exactă** unde vrei să plasezi fișierul/directorul
4. **Verifică că destinația nu există deja**
5. **Execută comanda cu calea ABSOLUTĂ când este posibil**

### Exemple de Verificări Corecte

```bash
# GREȘIT - poate crea duplicate
mkdir backend/api-service

# CORECT - verifică mai întâi
ls -la backend/
# Doar după verificare:
mkdir backend/api-service

# GREȘIT - calea relativă ambiguă
touch src/config/database.ts

# CORECT - calea absolută verificată
ls -la /Users/victorsafta/work/z_app/backend/api-service/src/config/
touch /Users/victorsafta/work/z_app/backend/api-service/src/config/database.ts
```

### 🚨 Red Flags - Oprește Imediat Dacă Vezi:

- `backend/api-service/backend/` - Duplicat nested
- `frontend/frontend/` - Duplicat nested  
- Orice structură care se repetă în mod nested
- Căi care conțin numele directorului de 2 ori consecutiv

## ⚠️ Avertismente Importante

- **NICIODATĂ nu sari peste pași** din implementare.md
- **NICIODATĂ nu implementezi multiple features** simultan
- **ÎNTOTDEAUNA verifică structura directorului** înainte de mkdir/touch/cp/mv
- **ÎNTOTDEAUNA testează** înainte de a marca completat
- **ÎNTOTDEAUNA așteaptă confirmarea** utilizatorului

## 📞 Support

Pentru întrebări despre proiect:
1. Consultă documentația existentă
2. Verifică implementare.md pentru context
3. Întreabă utilizatorul pentru clarificări

---

**Ultima actualizare:** 2025-01-03
**Versiune metodologie:** 1.0
**Următorul pas curent:** Verifică implementare.md