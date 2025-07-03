# 📘 Document de Referință: Stadiul Actual al Aplicației ZAEUS (v2.0)

**Data:** 3 iulie 2025\
**Autor:** Victor Safta\
**Stack:** Node.js + Express | React + TypeScript | PostgreSQL + Redis | OpenAI GPT-3.5 / Claude | Ollama (LLaMA 3.2, Mistral) | Tailwind CSS | AntV G2Plot | WebSockets | Bull Queue

---

## 🔹 Scopul Aplicației

ZAEUS este un asistent educațional AI pentru traderi activi pe piețele financiare (forex, acțiuni, indici, mărfuri), cu scopul de a-i ghida prin învățare personalizată, analiză a istoricului de tranzacționare și sprijin în luarea deciziilor. Aplicația oferă un spațiu natural, intuitiv și personalizat de învățare, evoluție și reflecție asupra stilului propriu de tranzacționare.

Aplicația este construită pe un model **hibrid**:

- 🟢 *Modul Prietenos* (default): rulează complet local, cu modele open-source (Ollama)
- 🔵 *Modul Expert*: activează puterea modelelor comerciale (Claude, GPT) pentru analiză avansată (contra cost)

---

## 🏗️ Arhitectură Generală

### 🔸 0. Version Control & Development Workflow

- **Git** pentru version control cu branching strategy
- **Git Flow** sau **GitHub Flow** pentru development workflow
- **Branch Protection Rules** pentru main/develop
- **Pull Requests** cu code review obligatoriu
- **Conventional Commits** pentru istoric clar
- **.gitignore** optimizat pentru Node.js/React
- **Git hooks** cu Husky pentru pre-commit checks

### 🔸 1. Frontend

- **Framework:** React 19 + TypeScript 4.9.5
- **UI Library:** Radix UI (headless components) + Tailwind CSS
- **Styling:** Tailwind CSS + Tailwind Variants (clsx + cva)
- **State Management:** Zustand pentru state local
- **Data Fetching:** TanStack Query (React Query)
- **Grafică:** AntV G2Plot pentru vizualizări complexe
- **Routing:** React Router 6.23
- **Mobile:** PWA cu @tailwindcss/container-queries
- **UX/Componente:**
  - Pagini: Login, Dashboard, Quiz, ForexAI, Settings
  - Design System: Custom ZAEUS UI components
  - Servicii: `authService.ts`, `aiService.ts`, `api.ts`

### 🔸 2. Backend Architecture (Microservices)

#### 2.1 API Service (Port 3000)
- **Framework:** Node.js + Express 5.1.0
- **Responsabilități:** User management, auth, skills, activities, CRUD operations
- **Autentificare:** JWT + bcrypt + 2FA opțional
- **Rate Limiting:** Express-rate-limit per endpoint și user
- **Endpoints:** `/auth`, `/users`, `/skills`, `/activity`, `/settings`
- **Database:** PostgreSQL connection pool pentru queries rapide

#### 2.2 AI Orchestrator Service (Port 3001)
- **Framework:** Node.js + Express/Fastify pentru performanță
- **Responsabilități:** Coordonare agenți AI, context management, streaming responses
- **Queue:** Bull Queue pentru procesări asincrone
- **WebSockets:** Socket.io pentru chat real-time
- **Endpoints:** `/ai/chat`, `/ai/agents`, `/ws` (WebSocket)
- **Features:**
  - Agent lifecycle management
  - Memory Context Protocol implementation
  - Context sharing între agenți via Redis
  - Load balancing între modele
  - Fallback logic (Expert → Prietenos)
  - Response streaming pentru UX fluid
  - Memory persistence și garbage collection

#### 2.3 Shared Infrastructure
- **Database:** PostgreSQL (shared, but separate schemas)
- **Cache:** Redis pentru sesiuni și rezultate AI
- **Message Bus:** Redis Pub/Sub pentru comunicare între servicii
- **Monitoring:** Centralizat cu OpenTelemetry

### 🔸 3. Bază de date & Securitate Conversații

#### Database Architecture
- **Primary:** PostgreSQL 15+ cu replicare și backup automat
- **Development:** PostgreSQL în Docker pentru paritate cu producția

#### 🔐 Conversation Security Layer
- **Column-Level Encryption** pentru `ai_chat_history`:
  - `user_message` - Encrypted cu AES-256-GCM
  - `agent_response` - Encrypted cu AES-256-GCM
  - `context_metadata` - Encrypted JSON
  - `user_id` - Hashed pentru anonimizare
- **Key Management:**
  - AWS KMS sau HashiCorp Vault pentru key rotation
  - Separate encryption keys per user
  - Automatic key rotation la 90 zile
- **Access Control:**
  - Row Level Security (RLS) în PostgreSQL
  - Audit logs pentru orice acces la conversații
  - GDPR-compliant data retention policies

#### Tabele esențiale:
- **Core:** `users`, `learning_progress`, `user_activity_log`
- **AI Secure:** `ai_chat_history_encrypted`, `agent_memories_encrypted`
- **Trading:** `forex_skills`, `user_skills`, `trading_strategies`
- **Memory:** `shared_contexts`, `memory_events` (temporal, nu se criptează)
- **Config:** `agent_configs`, `user_preferences`
- **Analytics:** `ai_usage_metrics`, `frustration_events`, `agent_performance_logs`

#### Fine-tuning Data Pipeline
- **Anonymization:** Remove PII înainte de export
- **Aggregation:** Batch processing pentru patterns comune
- **Consent Management:** Explicit opt-in pentru data usage
- **Secure Export:** Encrypted data lakes pentru ML training

---

## 🎨 ZAEUS Design System

### Principii de Design
- **Natural & Fluid** - Interfață care inspiră libertate și explorare
- **Non-Corporate** - Evităm designul rigid sau "școlar"
- **Personalizabil** - Teme diferite pentru modul Prietenos vs Expert
- **Accesibil** - Dark mode, screen readers, WCAG compliance

### Component Library Standardizat

| Componentă | Scop | Features |
|------------|------|----------|
| **Button** | Acțiuni principale | Variants: primary, secondary, ghost, AI-powered |
| **Input** | Date utilizator | AI completare, validare real-time |
| **Card** | Container info | Animated, glassmorphism pentru modul Expert |
| **Modal/Dialog** | Feedback contextual | Smooth transitions, backdrop blur |
| **AgentBubble** | Mesaje AI | Typing animation, avatar dinamic |
| **ChatWindow** | Conversații | WebSocket-ready, virtual scroll, voice input |
| **Badge** | Achievements | Nivel, XP, skill mastery cu animații |
| **Tooltip** | Hints educaționale | AI-powered contextual help |
| **ProgressGraph** | Vizualizări | AntV G2Plot pentru date complexe |

### Componente AI-Friendly
- **ExpandableAIExplanation** - Detalii progressive pentru explicații
- **CodeBlock** - Syntax highlighting cu feedback buttons
- **VoiceInput/Output** - Interacțiune vocală opțională
- **StreamingText** - Pentru răspunsuri AI în timp real

### Theming & Branding
- **Design Tokens** - Culori, spacing, typography centralizate
- **Mode Switching** - Tranziție smooth între Prietenos/Expert
- **CSS Variables** - Pentru theming dinamic
- **Animation Library** - Framer Motion pentru micro-interactions

---

## 🤖 Sistem Multi-Agent AI (Extensibil, Modular)

### 🔹 Agent Orchestrator

- Coordonează toți agenții și asigură coerența răspunsurilor
- Context sharing între agenți pentru continuitate
- Sistem de fallback automat: Expert → Prietenos când API-urile sunt indisponibile
- Load balancing între modele pentru optimizare costuri

### 🧠 Memory Context Protocol (MCP)

#### Arhitectură Memoriei
1. **Agent Memory (Persistent)**
   - Fiecare agent are memoria proprie în PostgreSQL
   - Istoricul conversațiilor specifice agentului
   - Preferințe și patterns învățate per user
   - TTL configurable pentru date vechi

2. **Shared Context Channel (Temporal)**
   - Redis cu TTL pentru sesiunea curentă
   - Context comun accesibil tuturor agenților activi
   - Event-driven updates via Redis Pub/Sub
   - Auto-cleanup după inactivitate

3. **Memory Sync Protocol**
   ```
   User → Agent A → Orchestrator → Shared Context
                                 ↓
                    Agent B ← Context Update Event
   ```

#### Componente MCP
- **Context Manager:** Gestionează ciclul de viață al memoriei partajate
- **Memory Merger:** Rezolvă conflicte între memorii diferite
- **Privacy Filter:** Asigură că date sensibile nu sunt partajate
- **Relevance Scorer:** Prioritizează ce informații sunt partajate

### 🔹 Agentul Central – `00Z`

- Agent personal al fiecărui user
- Rulează local în Ollama cu fallback pe cloud
- Ține evidența interacțiunilor, stilului, nivelului
- Propune direcții de studiu, clarifică întrebări, sprijină în decizii
- Memoria este **invizibilă** pentru utilizator (istoric doar în backend)
- Configurabil de administrator (model, rol, prompt)
- Sincronizare context cu ceilalți agenți via Orchestrator

### 🔹 Agenți Suplimentari:

| Agent               | Niveluri  | Model       | Scop principal                                       |
| ------------------- | --------- | ----------- | ---------------------------------------------------- |
| 👨‍🏫 Mentor Agent  | Prietenos | LLaMA       | Educație, explicații, ghidaj pe înțelesul userului   |
|                     | Expert    | GPT/Claude  | Feedback strategic pe greșeli recurente              |
| 📰 Reporter Agent   | Prietenos | Local (RSS) | Afișează știri relevante per simbol / activ          |
|                     | Expert    | GPT/Claude  | Interpretează impactul știrilor în stilul userului   |
| 📈 Analyst Agent    | Prietenos | Python+OSS  | Procesează fișiere de trading, identifică patternuri |
|                     | Expert    | GPT/Claude  | Analize avansate pe stil și performanță istorică     |
| 🎯 Strategist Agent | Prietenos | LLaMA       | Planificare personală de obiective și rutine         |
|                     | Expert    | Claude/GPT  | Recomandări adaptive în funcție de condițiile pieței |

---

## 🔁 Mod de Funcționare: Naturalețe și Personalizare

- Fără constrângeri, fără presiune – aplicația crește odată cu userul
- 00Z înlocuiește conceptele clasice de „misiuni zilnice” cu „explorări propuse”
- Nivelarea se face prin performanță susținută (ex: 5 quiz-uri perfecte)
- Educația este adaptivă, în ritm propriu, fără forțare artificială
- **Userul nu este un elev, ci un explorator** ghidat de AI
- Interacțiunea este **confidențială**, fără acces la istoricul conversațiilor

---

## 📚 Metodologie Educațională

- Se pleacă de la fundamentele mecanismelor pieței (cerere, ofertă, lichiditate, spread etc.)

- Se introduc treptat **skilluri forex specializate**:

  1. Analiză tehnică
  2. Psihologie în trading
  3. Risk Management
  4. Price Action
  5. Indicatori tehnici
  6. Money Management
  7. Fundamente economice

- Se utilizează quiz adaptiv + feedback AI pentru testare
- ArXP și nivelare pe skilluri, vizualizate cu grafice intuitive
- Se promovează în paralel **educație financiară și economică generală**

---

## 🔧 Configurabilitate din Platformă

- Fiecare agent are:
  - Model selectabil (local/comercial)
  - Instrucțiuni și rol definit
  - Test activare model (ex: ping model Ollama)
- Fiecare utilizator are:
  - Istoric conversațional păstrat doar în backend (invizibil)
  - Adaptare continuă a feedbackului și propunerilor

---

## 🔐 Securitate și Acces Avansat

- JWT Auth pe backend + `PrivateRoute` pe frontend
- Hashing parole cu bcrypt + salt
- Query-uri parametrizate (evitare SQL injection)
- API key OpenAI/Claude doar dacă este activ modul „Expert”

- 2FA (Two-Factor Authentication) pentru conturi cu acces la modul Expert
- Rate limiting per endpoint și per user
- **Column-level encryption** pentru conversații AI (AES-256-GCM)
- **Key Management Service** (AWS KMS/Vault) pentru encryption keys
- **Zero-knowledge architecture** pentru date ultra-sensibile
- API key rotation automată pentru serviciile externe
- CORS configurabil și Content Security Policy
- Audit logs pentru toate acțiunile critice
- **GDPR & Privacy by Design** compliance

---

## 🚀 Scalabilitate și Performanță

### Infrastructure
- **Containerizare:** Docker pentru toate componentele
  - API Service container
  - AI Orchestrator container
  - PostgreSQL container
  - Redis container
  - NGINX container
- **Docker Compose:** Pentru development environment
- **Orchestrare:** Kubernetes pentru deployment și scaling
- **Service Mesh:** Istio pentru comunicare între microservicii (opțional)
- **Load Balancing:** NGINX pentru distribuția traficului
- **CDN:** CloudFlare pentru asset-uri statice

### Frontend Optimizations
- **Progressive Web App (PWA)** pentru acces mobil offline
- **Code Splitting** și lazy loading pentru componente React
- **Virtual Scrolling** pentru liste lungi și istoric conversații
- **Service Workers** pentru caching inteligent
- **WebP/AVIF** pentru imagini optimizate

### Backend Optimizations
- **Database Connection Pooling** cu pgBouncer
- **Query Optimization** cu indexare strategică
- **Horizontal Scaling** pentru microservicii AI
- **Caching Strategy:** Redis pentru date frecvent accesate
- **Compression:** Brotli pentru răspunsuri API

---

## 📊 Monitorizare și Analytics

### System Monitoring
- **OpenTelemetry** pentru distributed tracing
- **Prometheus + Grafana** pentru metrici sistem
- **ELK Stack** (Elasticsearch, Logstash, Kibana) pentru logs
- **Sentry** pentru error tracking și performance monitoring

### User Analytics
- **User Behavior Analytics** pentru îmbunătățirea UX
- **A/B Testing Framework** pentru features noi
- **Heatmaps** pentru optimizare interfață
- **Trading Performance Analytics** per user

### 📈 AI Usage Analytics & Heatmaps
- **Agent Usage Heatmap**
  - Vizualizare interactivă: care agent e cel mai folosit
  - Time-based patterns: când sunt folosiți agenții
  - User segments: preferințe per tip de trader
  - Geographic distribution: usage per regiune
  
- **Frustration Detection**
  - **Rage clicks** pe butoane AI
  - **Response abandonment** rate per agent
  - **Retry patterns** - când userii reîncearcă întrebări
  - **Session drop-off** după interacțiuni eșuate
  - **Sentiment analysis** pe conversații
  
- **Conversation Flow Analysis**
  - **Agent switching patterns** - când trec de la un agent la altul
  - **Dead-end detection** - conversații care nu duc nicăieri
  - **Success metrics** - conversații care duc la acțiuni pozitive
  - **Query complexity** heatmap - ce tipuri de întrebări primesc
  
- **Performance Insights Dashboard**
  - **Response time heatmap** per agent și model
  - **Error rate visualization** în timp real
  - **Context switching frequency** între agenți
  - **Model fallback patterns** (Expert → Prietenos)

### Business Intelligence
- **Cost Management Dashboard** pentru API usage
- **User Retention Metrics**
- **Feature Adoption Tracking**
- **Revenue Analytics** pentru modul Expert

---

## 🎯 Funcționalități Viitoare

### Trading Features
- **Backtesting Simulator** integrat pentru strategii
- **Paper Trading Mode** cu date real-time
- **Strategy Builder** vizual drag-and-drop
- **Risk Calculator** avansat cu Monte Carlo simulations

### Community & Social
- **Strategy Marketplace** (share/sell strategies)
- **Mentorship Program** între utilizatori avansați și începători
- **Trading Competitions** cu premii virtuale
- **Anonymous Performance Leaderboards**

### Integrations
- **MetaTrader 4/5 Bridge** pentru sync automat
- **TradingView Integration** pentru analiză tehnică
- **Broker APIs** pentru execuție directă (IBKR, Oanda)
- **Economic Calendar API** cu impact predictions

### AI Enhancements
- **Custom Model Fine-tuning** per user style
- **Voice Interface** pentru comenzi rapide
- **AI Trade Journaling** cu analiză automată
- **Sentiment Analysis** pe știri și social media
- **Pattern Recognition** cu computer vision pe charts

### Mobile Experience
- **Native Mobile Apps** (iOS/Android)
- **Push Notifications** pentru alerte importante
- **Offline Mode** cu sync când revine conexiunea
- **Widget Support** pentru quick stats

---

## 🧪 Testing Strategy

### Automated Testing
- **Unit Tests:** Jest pentru frontend, Mocha pentru backend
- **Integration Tests:** Supertest pentru API endpoints
- **E2E Tests:** Cypress pentru flow-uri complete
- **Performance Tests:** k6 pentru load testing
- **Security Tests:** OWASP ZAP pentru vulnerabilități

### Quality Assurance
- **Code Coverage:** minim 80% pentru cod nou
- **Pre-commit Hooks:** Husky + lint-staged
  - ESLint pentru code quality
  - Prettier pentru formatare consistentă
  - TypeScript type checking
  - Conventional commits validation
- **CI/CD Pipeline:** GitHub Actions cu deployment stages
- **Canary Deployments:** pentru features critice

---

## ✅ Concluzie Finală

ZAEUS este o platformă unică, centrată pe individ, ce oferă:

- 🧠 O experiență **naturală, intuitivă**, fără presiune educațională
- 🤖 Puterea AI în două moduri: **prietenos local** și **expert comercial**
- 🔄 O arhitectură pregătită pentru scalare, fine-tuning și dezvoltare modulară

**Next Steps Prioritizate:**
1. **Infrastructure:** Setup PostgreSQL cu Docker și implementare Redis caching
2. **Real-time:** Implementare WebSockets cu Socket.io pentru chat
3. **Testing:** Setup comprehensive testing suite (Jest, Cypress, k6)
4. **Security:** Implementare 2FA și rate limiting
5. **AI Orchestration:** Dezvoltare Agent Orchestrator pentru coordonare
6. **Monitoring:** Setup OpenTelemetry și Prometheus/Grafana
7. **Features:** Backtesting simulator și integrări MetaTrader/TradingView

