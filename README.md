# SmartSeed Platform

**Blockchain-Based Seed Supply Chain Traceability, Counterfeit Detection and AI-Powered Risk Management Platform**

SmartSeed connects all stakeholders in the agricultural seed supply chain — from manufacturers to farmers — providing blockchain-verified traceability, AI-powered counterfeit detection, and transparent product passports.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SmartSeed Platform                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────┤
│  Web App │ Mobile   │ Backend  │ AI/ML    │ Block-   │ Infra-      │
│  React   │ React    │ Node.js  │ Python   │ chain    │ structure   │
│  Vite    │ Native   │ Express  │ FastAPI  │ HLF     │ Docker      │
│  TailCSS │ Expo     │ TypeScript│ sklearn │ Go      │ Nginx       │
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 20
- Python >= 3.10
- Docker & Docker Compose
- Git

### 1. Clone and Install

```bash
git clone <repo-url> smartseed
cd smartseed
cp .env.example .env
npm install
```

### 2. Start Infrastructure

```bash
npm run docker:up
```

This starts PostgreSQL, Redis, MinIO, and MailHog.

### 3. Run Database Migrations

```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Web Dashboard
npm run dev:web

# Terminal 3: AI Engine
cd services/ai-engine
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Access

| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| AI Engine | http://localhost:8000 |
| API Docs (AI) | http://localhost:8000/docs |
| MailHog | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@smartseed.io | SmartSeed@Admin2026 |
| Manufacturer | manufacturer@greengrow.example | Manufacturer@2026 |

## Project Structure

```
smartseed/
├── packages/
│   ├── shared/          # Shared TypeScript types and utilities
│   ├── backend/         # Express.js API server
│   ├── web/             # React web dashboard
│   ├── mobile/          # React Native farmer app
│   └── blockchain/      # Hyperledger Fabric network & chaincode
├── services/
│   └── ai-engine/       # Python FastAPI anomaly detection
├── infrastructure/
│   ├── docker/          # Docker configurations
│   └── nginx/           # Nginx reverse proxy config
├── docker-compose.dev.yml
└── package.json
```

## Key Features

- **Multi-tenant SaaS** — Multiple seed companies on one platform
- **Blockchain Traceability** — Hyperledger Fabric for immutable records
- **AI Anomaly Detection** — Isolation Forest + rule-based hybrid detection
- **Risk Scoring** — 0-100 configurable risk scores with weighted signals
- **QR Verification** — Cryptographic QR codes with counterfeit detection
- **Digital Product Passport** — Complete product lifecycle documentation
- **Farmer Mobile App** — Multilingual (EN/TE/HI) with offline support
- **Real-time Alerts** — WebSocket notifications for suspicious activity
- **Investigation Agent** — AI-powered evidence analysis and reporting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Redis |
| Blockchain | Hyperledger Fabric, Go Chaincode |
| AI/ML | Python, FastAPI, scikit-learn |
| Mobile | React Native, Expo |
| Infrastructure | Docker, Nginx |

## License

Proprietary — All rights reserved.

