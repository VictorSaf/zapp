# 🧠 ZAEUS - AI Trading Education Platform

> Asistent educațional AI pentru traderi activi pe piețele financiare

## 🎯 Despre ZAEUS

ZAEUS este o platformă hibridă care combină puterea AI-ului local (Ollama) cu modele cloud (GPT/Claude) pentru a oferi o experiență educațională naturală și personalizată pentru traderi.

### Caracteristici Principale

- 🤖 **Sistem Multi-Agent** cu orchestrare inteligentă
- 🔒 **Privacy by Design** cu conversații encriptate
- 📱 **Mobile-First PWA** cu suport pentru gesturi
- 🎨 **Design System Custom** cu Radix UI + Tailwind
- ⚡ **Real-time Chat** prin WebSockets

## 🏗️ Arhitectură

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   React 19 +    │◄──►│   API Service   │
│   TypeScript    │    │   (Port 3000)   │
└─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │ AI Orchestrator │
                       │   (Port 3001)   │
                       └─────────────────┘
                              │
                       ┌─────────────────┐
                       │  PostgreSQL +   │
                       │     Redis       │
                       └─────────────────┘
```

## 🚀 Quick Start

```bash
# Setup complet cu Docker
docker-compose up -d

# Frontend development
cd frontend && npm run dev

# Backend API development
cd backend/api-service && npm run dev

# AI Orchestrator development
cd backend/ai-orchestrator && npm run dev
```

## 📚 Documentație

- [`z_app.md`](./z_app.md) - Arhitectura completă
- [`app_flow.md`](./app_flow.md) - Flow UX și interacțiuni
- [`implementare.md`](./implementare.md) - Plan de dezvoltare
- [`CLAUDE.md`](./CLAUDE.md) - Ghid pentru agenții AI

## 🛠️ Stack Tehnologic

### Frontend
- **React 19** + TypeScript
- **Tailwind CSS** + Radix UI
- **Zustand** pentru state management
- **React Query** pentru data fetching

### Backend
- **Node.js** + Express
- **PostgreSQL** cu encryption
- **Redis** pentru caching
- **Socket.io** pentru WebSockets

### AI & ML
- **Ollama** (LLaMA, Mistral) pentru local
- **OpenAI GPT** + **Claude** pentru cloud
- **Memory Context Protocol** pentru sincronizare

## 🔐 Securitate

- Column-level encryption pentru conversații
- JWT + 2FA pentru Expert mode
- Rate limiting și audit logs
- GDPR compliance built-in

## 🤖 Agenții AI

- **00Z** - Agent central personal
- **Mentor Agent** - Educație și ghidaj
- **Reporter Agent** - Știri și analize
- **Analyst Agent** - Procesare date
- **Strategist Agent** - Planificare

## 📊 Status Dezvoltare

**Versiune Curentă:** v1.0-dev  
**Următorul Milestone:** Setup infrastructură de bază

Vezi [`implementare.md`](./implementare.md) pentru progresul detaliat.

## 🤝 Contribuții

Pentru dezvoltatori care lucrează la proiect:
1. Citește [`CLAUDE.md`](./CLAUDE.md) pentru ghiduri
2. Urmează [`implementare.md`](./implementare.md) pas cu pas
3. Testează complet înainte de commit

## 📄 Licență

Private - Victor Safta © 2025

---

**Ultimă actualizare:** 2025-01-03