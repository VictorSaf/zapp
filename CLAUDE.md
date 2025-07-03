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
2. **Implementează DOAR pasul curent**
3. **Testează funcționalitatea complet**
4. **Prezintă rezultatele utilizatorului**
5. **Așteaptă confirmarea pentru următorul pas**
6. **Marchează pasul ca IMPLEMENTAT cu timestamp**

### Format Raportare
```
✅ PAS X.Y - Numele Pasului
IMPLEMENTAT: [timestamp]
OBSERVAȚII: [ce a fost implementat]
TESTE: [ce teste au fost rulate și rezultat]
```

## 🏗️ Arhitectură Tehnică

### Stack Principal
- **Frontend:** React 19 + TypeScript + Tailwind CSS + Radix UI
- **Backend:** Node.js + Express (2 microservicii)
  - API Service (port 3000) - auth, users, CRUD
  - AI Orchestrator (port 3001) - agenți AI, WebSocket
- **Database:** PostgreSQL cu column-level encryption
- **Cache:** Redis pentru sesiuni și context sharing
- **AI:** Ollama (local) + OpenAI/Claude (cloud)

### Componente Cheie
- **Agent 00Z** - Agentul central personal
- **Memory Context Protocol** - Sincronizare între agenți
- **Radix UI + Tailwind** - Design system custom
- **WebSockets** - Chat real-time
- **Zustand** - State management

## 🎯 Principii de Design

1. **Experiență Naturală** - Nu corporate, nu școlar
2. **Privacy by Design** - Conversații encriptate
3. **Mobile-First** - PWA cu gesture support
4. **Accessibility** - WCAG compliant
5. **Performance** - Lazy loading, virtual scroll

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

## ⚠️ Avertismente Importante

- **NICIODATĂ nu sari peste pași** din implementare.md
- **NICIODATĂ nu implementezi multiple features** simultan
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