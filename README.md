<p align="center">
  <img src="docs/assets/logo.svg" alt="IdeaHub Logo" width="120" />
</p>

<h1 align="center">IdeaHub</h1>

<p align="center">
  <strong>Collaborative Idea Management & Development Tracking Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Fastify-5-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Prisma-6.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/WebSocket-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="WebSocket" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Free%20for%20Personal%20Use-blue?style=flat-square" alt="License: Free for Personal Use" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square&logo=node.js&logoColor=white" alt="Node >= 20" />
  <img src="https://img.shields.io/badge/npm-11.6-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 11.6" />
  <img src="https://img.shields.io/badge/turborepo-monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/i18n-TR%20%7C%20EN-blue?style=flat-square" alt="i18n" />
</p>

---

## Overview

IdeaHub is a full-stack, real-time collaborative platform for managing ideas from inception to implementation. Teams can submit, discuss, vote on, and track ideas through customizable workflows — all with instant updates via WebSocket.

## Features

- **Real-time Collaboration** — WebSocket-first architecture with PostgreSQL LISTEN/NOTIFY + Redis Pub/Sub broadcasting
- **Idea Management** — Create, categorize, and track ideas through customizable status workflows
- **Weighted Voting** — Configurable voting rules with per-category/department multipliers
- **Kanban Board** — Visual drag-and-drop workflow with per-column lazy loading and sprint/time filters
- **Sprint Planning** — Time-boxed development cycles with idea assignment
- **Surveys & Polls** — Multi-format surveys (polls, ratings) with auto-transitions
- **Threaded Comments** — Nested discussions with like reactions, cursor-based pagination for replies
- **Role-Based Access** — Admin, Product Manager, and User roles with granular permissions
- **Notifications** — Real-time in-app + email notifications with user preferences
- **File Attachments** — S3-compatible storage (MinIO / AWS S3)
- **Internationalization** — Turkish and English language support
- **Theming** — Light, Dark, and System (OS-follow) themes with custom color palettes
- **Markdown Support** — Rich text rendering in idea descriptions and comments
- **Horizontal Scaling** — Redis-backed multi-instance support with leader election and PM2 cluster mode
- **Selective Broadcasting** — Clients subscribe to channels for efficient WS message delivery
- **Request Deduplication** — Prevents duplicate in-flight WebSocket requests

## Architecture

```
ideahub/
├── apps/
│   ├── server/              # Fastify 5 backend (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/      # REST endpoints (auth, health, upload, settings)
│   │   │   ├── ws/handlers/ # WebSocket handlers (13 domains)
│   │   │   ├── plugins/     # Fastify plugins (auth, prisma, email, storage, ws)
│   │   │   ├── services/    # Business logic (notifications)
│   │   │   ├── lib/         # Utilities (JWT, password, storage, logger)
│   │   │   └── i18n/        # Server-side translations
│   │   └── prisma/          # Schema, migrations, seeds (dev + prod)
│   │
│   └── web/                 # React 19 frontend (JSX)
│       └── src/
│           ├── pages/       # Route pages (8 pages)
│           ├── components/  # Reusable UI components
│           ├── stores/      # Zustand state management
│           ├── lib/         # API client, WS client, integrations
│           └── i18n/        # Client-side translations (TR + EN)
│
├── packages/
│   └── shared/              # Shared Zod schemas & protocol definitions
│       └── src/schemas/     # 13 schema files (user, idea, vote, comment, etc.)
│
├── docker-compose.yml       # PostgreSQL + MailHog + MinIO
├── turbo.json               # Turborepo pipeline config
└── package.json             # Workspace root
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, Zustand, React Router 7, Framer Motion, Lucide Icons |
| **Backend** | Fastify 5, TypeScript 5.8, Prisma 6.8, Zod |
| **Database** | PostgreSQL 17 |
| **Real-time** | WebSocket + PG LISTEN/NOTIFY + Redis Pub/Sub |
| **Caching** | Redis 7 (optional, for multi-instance scaling) |
| **Storage** | MinIO (S3-compatible) / Local filesystem |
| **Email** | Nodemailer + MailHog (dev) |
| **Auth** | JWT (15min access + 7d refresh with rotation) |
| **Monorepo** | Turborepo + npm workspaces |
| **Process** | PM2 cluster mode (multi-instance) |
| **Infra** | Docker Compose |

## Prerequisites

- **Node.js** >= 20
- **npm** >= 11
- **Docker** & **Docker Compose**

## Getting Started

### 1. Clone & Install

```bash
git clone <repository-url>
cd ideahub
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 17** on port `5432`
- **Redis 7** on port `6379`
- **MailHog** on ports `1025` (SMTP) / `8025` (Web UI)
- **MinIO** on ports `9000` (API) / `9001` (Console)

### 3. Setup Database

```bash
npm run db:migrate    # Run Prisma migrations
npm run db:seed       # Populate seed data (dev mode)
```

The seed system supports two modes:
- **Dev** (default): Creates 8 sample users, 58 ideas with real comments/votes, surveys, and notifications
- **Prod**: Creates only an admin user with default categories and statuses

```bash
# Dev seed (default)
npm run db:seed

# Production seed
SEED_MODE=prod npm run db:seed
```

### 4. Configure Environment

Create `.env` files in `apps/server/` based on `.env.example`.

### 5. Start Development

```bash
npm run dev
```

This starts both the backend and frontend in development mode via Turborepo.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| MailHog UI | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |

**Default Logins:**

| Mode | Email | Password |
|------|-------|----------|
| Dev | `elif.kaya@sirket.com` | `password123` |
| Prod | `admin@ideahub.com` | `Qazxsw123**` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in dev mode |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run db:migrate` | Create and run Prisma migrations |
| `npm run db:seed` | Seed database with dev data |
| `SEED_MODE=prod npm run db:seed` | Seed database with prod data (admin only) |
| `npm run db:reset` | Reset database and re-seed |

## API Protocol

IdeaHub uses a **WebSocket-first** approach. REST is only used for authentication, token refresh, file upload, and health checks.

### WebSocket Message Format

```jsonc
// Client -> Server (Action)
{ "type": "action", "id": "corr-123", "action": "ideas:create", "payload": { ... } }

// Server -> Client (Result)
{ "type": "result", "id": "corr-123", "action": "ideas:create", "data": { ... } }

// Server -> Client (Broadcast Event)
{ "type": "event", "event": "idea:created", "data": { ... } }
```

### WebSocket Domains

`ideas` · `votes` · `comments` · `surveys` · `sprints` · `statuses` · `categories` · `notifications` · `users` · `voting-rules` · `preferences` · `settings` · `auth`

## Database Schema

Core models: **User**, **Category**, **Status**, **Sprint**, **Idea**, **Vote**, **Comment**, **CommentLike**, **Attachment**, **Survey**, **SurveyOption**, **SurveyVote**, **SurveyRating**, **Notification**, **RefreshToken**, **UserPreferences**, **AppSettings**, **VotingRule**

## License

This project is free for personal, educational, and non-commercial use. Commercial use requires a separate license. See [LICENSE](LICENSE) for details.

For commercial licensing inquiries, contact: **yunusergul97@gmail.com**
