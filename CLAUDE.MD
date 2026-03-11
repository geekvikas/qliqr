# CLAUDE.md — qliqr Platform Build Instructions
# Multi-Agent Construction Manual v1.0

> **READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.**
> This file is the source of truth for every agent in this build.
> All agents must check back here when uncertain about any decision.

---

## 0. WHAT YOU ARE BUILDING

**qliqr** is a zero-cost-to-play, ad-funded prize game platform.

- Sponsors fund prize pools by purchasing video ad views
- Players earn clicks by watching ads (1 second watched = 1 click, free)
- Every click resets a 30-second countdown timer
- When 30 seconds pass with zero clicks, the **last clicker wins the entire prize pool**
- No purchase ever required to play
- Multiple games run simultaneously, each sponsored by a different brand

**Scale target:** Millions of concurrent users. Every architectural decision must support this.

---

## 1. ORCHESTRATOR INSTRUCTIONS

You are the **Lead Orchestrator**. Your job is to spawn, coordinate, and validate subagents. You do not write application code directly — you delegate, review output, and integrate.

### Orchestrator Responsibilities

1. Read this entire CLAUDE.md before spawning any agents
2. Spawn agents in the order defined in Section 4 (respects dependency graph)
3. After each agent completes, run the validation checklist for that agent (Section 10)
4. If an agent's output fails validation, re-spawn with the failure context appended
5. Maintain a `BUILD_LOG.md` at repo root — log each agent's completion status
6. Never merge an agent's work if TypeScript errors exist (`pnpm typecheck` must pass)
7. Run `pnpm test` after each phase completes. Block progress on test failure.

### Orchestrator Decision Rules

- If two agents could own a piece of code, the **lower-numbered agent owns it**
- If an agent asks a question not answered here, **make the conservative choice** and document it in `BUILD_LOG.md`
- Shared types always live in `packages/db/src/types.ts` — never duplicate them
- Never let an agent install a package not on the approved list (Section 6)
- All secrets go in `.env.local` (web), `.env` (ws-server) — never hardcoded

---

## 2. REPOSITORY STRUCTURE

Initialize as a **Turborepo monorepo** with pnpm workspaces. Create this exact structure before spawning any agents:

```
qliqr/
├── CLAUDE.md                        ← This file
├── BUILD_LOG.md                     ← Orchestrator maintains this
├── package.json                     ← Root workspace config
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example                     ← All env vars documented, no values
├── docker-compose.yml               ← Local Postgres + Redis
├── apps/
│   ├── web/                         ← Agent 3: Next.js player app
│   ├── sponsor/                     ← Agent 7: Next.js sponsor dashboard
│   └── ws-server/                   ← Agent 4: WebSocket server
├── packages/
│   ├── db/                          ← Agent 1: Schema + migrations
│   ├── ui/                          ← Agent 2: Shared component library
│   ├── game-engine/                 ← Agent 5: Core game logic
│   └── config/                      ← Agent 0 (Orchestrator): Shared configs
└── infra/
    └── fly.toml                     ← Agent 4 creates this
```

### Root package.json

```json
{
  "name": "qliqr",
  "private": true,
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "db:migrate": "pnpm --filter @qliqr/db migrate",
    "db:seed": "pnpm --filter @qliqr/db seed",
    "db:studio": "pnpm --filter @qliqr/db studio"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env.example"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: qliqr
    volumes: ["postgres_data:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --notify-keyspace-events KEx
volumes:
  postgres_data:
```

---

## 3. TECHNOLOGY STACK (LOCKED — NO SUBSTITUTIONS)

| Layer | Technology | Version |
|---|---|---|
| Package Manager | pnpm | 9+ |
| Monorepo | Turborepo | latest |
| Frontend Framework | Next.js | 15 (App Router) |
| Language | TypeScript | 5.5+ strict mode |
| Styling | Tailwind CSS | 4 |
| UI Components | Custom (packages/ui) + shadcn/ui | latest |
| State Management | Zustand + TanStack Query | v5 |
| Real-Time | Socket.io | 4.x |
| Database ORM | Drizzle ORM | latest |
| Database | PostgreSQL via Supabase | 15+ |
| Cache | Upstash Redis | REST SDK |
| Auth | Clerk | latest |
| Payments | Stripe + Stripe Connect | latest |
| Video Delivery | Cloudflare Stream | REST API |
| Job Queue | Upstash QStash | latest |
| Email | Resend + React Email | latest |
| Analytics DB | Clickhouse Cloud | HTTP driver |
| Product Analytics | PostHog | latest |
| Error Tracking | Sentry | latest |
| Testing | Vitest + Playwright | latest |
| Linting | ESLint 9 + Prettier | latest |

**Do not install any package not listed here without explicit orchestrator approval documented in BUILD_LOG.md.**

---

## 4. AGENT SPAWN ORDER & DEPENDENCY GRAPH

```
Phase A (Parallel — no dependencies):
  Agent 1: Database & Schema
  Agent 2: UI Component Library

Phase B (Depends on Phase A):
  Agent 3: Next.js Web App Shell
  Agent 4: WebSocket Server
  Agent 5: Game Engine Package

Phase C (Depends on Phase B):
  Agent 6: Ad System & Fraud Detection
  Agent 7: Sponsor Dashboard

Phase D (Depends on Phase C):
  Agent 8: Payments & Payouts
  Agent 9: Viral Growth & Notifications

Phase E (Depends on Phase D):
  Agent 10: DevOps, CI/CD & Monitoring
```

Spawn agents within the same phase in parallel using the Task tool.
Never spawn a phase until ALL agents in the previous phase have passed validation.

---

## 5. AGENT SPECIFICATIONS

---

### AGENT 1 — Database & Schema Package
**Package:** `packages/db`
**Can start:** Immediately (Phase A)
**Blocks:** Agents 3, 4, 5, 6, 7, 8

#### Setup

```bash
mkdir -p packages/db/src/{schema,migrations}
cd packages/db
pnpm init
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit tsx dotenv
```

#### package.json for packages/db

```json
{
  "name": "@qliqr/db",
  "version": "0.0.1",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./types": "./src/types.ts"
  },
  "scripts": {
    "migrate": "drizzle-kit migrate",
    "generate": "drizzle-kit generate",
    "studio": "drizzle-kit studio",
    "seed": "tsx src/seed.ts"
  }
}
```

#### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

#### Schema: packages/db/src/schema/index.ts

Create ALL tables with these EXACT column definitions. Use Drizzle's `pgTable`.

**sponsors table:**
```typescript
export const sponsors = pgTable('sponsors', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').unique().notNull(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  logoUrl: text('logo_url'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  billingEmail: text('billing_email').notNull(),
  status: text('status').default('pending').notNull(), // pending | active | suspended
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

**campaigns table:**
```typescript
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsorId: uuid('sponsor_id').references(() => sponsors.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  status: text('status').default('draft').notNull(), // draft|active|paused|exhausted|ended
  videoStreamId: text('video_stream_id').notNull(),
  videoDurationSec: integer('video_duration_sec').notNull(),
  minWatchSec: integer('min_watch_sec').default(5).notNull(),
  cpvRate: numeric('cpv_rate', { precision: 10, scale: 6 }).notNull(),
  budgetCap: numeric('budget_cap', { precision: 12, scale: 2 }).notNull(),
  budgetSpent: numeric('budget_spent', { precision: 12, scale: 2 }).default('0').notNull(),
  poolPct: numeric('pool_pct', { precision: 5, scale: 2 }).default('25.00').notNull(),
  maxPool: numeric('max_pool', { precision: 12, scale: 2 }),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  targetRegions: text('target_regions').array().default([]),
  maxConcurrentGames: integer('max_concurrent_games').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
```

**users table:**
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  handle: text('handle').unique().notNull(),
  email: text('email').unique().notNull(),
  countryCode: text('country_code'),
  stripeAccountId: text('stripe_account_id').unique(),
  totalWinnings: numeric('total_winnings', { precision: 12, scale: 2 }).default('0').notNull(),
  totalClicks: integer('total_clicks').default(0).notNull(),
  gamesPlayed: integer('games_played').default(0).notNull(),
  gamesWon: integer('games_won').default(0).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  referrerId: uuid('referrer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

**games table:**
```typescript
export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'restrict' }).notNull(),
  roomCode: text('room_code').unique().notNull(),
  status: text('status').default('waiting').notNull(), // waiting|active|ended
  prizePool: numeric('prize_pool', { precision: 12, scale: 2 }).default('0').notNull(),
  playerCount: integer('player_count').default(0).notNull(),
  totalClicks: integer('total_clicks').default(0).notNull(),
  lastClickerId: uuid('last_clicker_id').references(() => users.id),
  lastClickAt: timestamp('last_click_at', { withTimezone: true }),
  winnerId: uuid('winner_id').references(() => users.id),
  wonAt: timestamp('won_at', { withTimezone: true }),
  timerSeconds: integer('timer_seconds').default(30).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

**ad_views table:**
```typescript
export const adViews = pgTable('ad_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  secondsWatched: integer('seconds_watched').notNull(),
  clicksEarned: integer('clicks_earned').notNull(),
  revenueGross: numeric('revenue_gross', { precision: 12, scale: 6 }),
  poolContribution: numeric('pool_contribution', { precision: 12, scale: 6 }),
  platformRevenue: numeric('platform_revenue', { precision: 12, scale: 6 }),
  ipHash: text('ip_hash'),
  userAgentHash: text('user_agent_hash'),
  fingerprintId: text('fingerprint_id'),
  completed: boolean('completed').default(false).notNull(),
  fraudScore: numeric('fraud_score', { precision: 4, scale: 3 }).default('0'),
  referrerId: uuid('referrer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

**clicks table:**
```typescript
export const clicks = pgTable('clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).defaultNow(),
  seq: integer('seq').notNull(),
  timerAtClick: integer('timer_at_click').notNull(),
})
```

**payouts table:**
```typescript
export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id).unique().notNull(),
  winnerId: uuid('winner_id').references(() => users.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  stripeTransferId: text('stripe_transfer_id'),
  status: text('status').default('pending').notNull(), // pending|processing|paid|failed|held
  heldReason: text('held_reason'),
  initiatedAt: timestamp('initiated_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
})
```

**referrals table:**
```typescript
export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').references(() => users.id).notNull(),
  referredId: uuid('referred_id').references(() => users.id).notNull().unique(),
  bonusClicksAwarded: boolean('bonus_clicks_awarded').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

#### Indexes to create (in a separate migration file):

```typescript
// games
index('games_campaign_status_idx').on(games.campaignId, games.status)
index('games_status_created_idx').on(games.status, games.createdAt)
index('games_room_code_idx').on(games.roomCode)

// ad_views
index('ad_views_campaign_created_idx').on(adViews.campaignId, adViews.createdAt)
index('ad_views_user_game_idx').on(adViews.userId, adViews.gameId)
index('ad_views_ip_hash_idx').on(adViews.ipHash)

// clicks
index('clicks_game_seq_idx').on(clicks.gameId, clicks.seq)
index('clicks_user_game_idx').on(clicks.userId, clicks.gameId)
```

#### packages/db/src/types.ts — Shared TypeScript types

Export `InferSelectModel` and `InferInsertModel` for every table. Also define:

```typescript
export type GameStatus = 'waiting' | 'active' | 'ended'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'exhausted' | 'ended'
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'held'
export type SponsorStatus = 'pending' | 'active' | 'suspended'

export interface LiveGameState {
  gameId: string
  timer: number          // seconds remaining
  pool: number           // current prize pool in cents
  playerCount: number
  totalClicks: number
  lastClickerId: string | null
  lastClickerHandle: string | null
  status: GameStatus
}

export interface ClickEvent {
  userId: string
  handle: string
  countryCode: string
  gameId: string
  seq: number
  timerAtClick: number
  timestamp: number
}

export interface WinEvent {
  gameId: string
  winnerId: string
  winnerHandle: string
  amount: number         // in cents
  totalClicks: number
  gameDurationMs: number
}
```

#### packages/db/src/seed.ts

Create realistic seed data:
- 3 sponsor records
- 5 campaign records (varying CPV rates: $0.01–$0.10)
- 10 game records in various states
- 50 user records with handles
- Sample click and ad_view records

---

### AGENT 2 — UI Component Library
**Package:** `packages/ui`
**Can start:** Immediately (Phase A)
**Blocks:** Agents 3, 7

#### Setup

```bash
cd packages/ui
pnpm init
pnpm add react react-dom
pnpm add -D typescript @types/react tailwindcss
```

#### Components to build (all TypeScript, all mobile-first):

**Design System tokens** (`src/tokens.ts`):
```typescript
export const tokens = {
  colors: {
    ink: '#0a0a0f',
    paper: '#f5f4ef',
    accent: '#e8ff00',     // primary CTA yellow-green
    red: '#ff3333',        // urgency / danger
    blue: '#0047ff',       // links / sponsor
    gold: '#ffd700',       // prize pool / winners
    muted: '#6a6a80',
    surface: '#13131a',
    border: '#e2e2e8',
    darkBorder: 'rgba(255,255,255,0.07)',
  },
  fonts: {
    display: 'Syne',       // headings — import from Google Fonts
    mono: 'DM Mono',       // data / stats / code
    body: 'Syne',
  },
}
```

**Components to implement** (each as its own file in `src/components/`):

1. **`Button`** — variants: `primary | secondary | danger | ghost`. Sizes: `sm | md | lg`. Full width option. Loading state with spinner.

2. **`GameCard`** — displays a live game. Props: `{ sponsorName, sponsorEmoji, sponsorColor, prizePool, timer, playerCount, adLengthSec, cpvRate, isHot, onPlay }`. Includes animated timer bar that ticks. Mobile: full width card.

3. **`CountdownRing`** — SVG circular timer. Props: `{ seconds, maxSeconds, size, urgencyThreshold }`. Fills red when urgent, orange when warning. Pulses when < 5 seconds. Optimized: uses `requestAnimationFrame`, not React state for animation.

4. **`ClickButton`** — the main game button. Props: `{ onClick, clicksRemaining, disabled, sponsorColor }`. Full haptic feedback via `navigator.vibrate`. Ripple animation on click. Disabled state shows "Watch ad for more clicks". Min touch target 80px diameter.

5. **`PrizePool`** — animated number counter. Props: `{ amount, currency }`. Uses `useSpring`-style animation to count up when amount changes. Large format, gold color.

6. **`LiveFeed`** — scrolling activity feed. Props: `{ events: FeedEvent[] }`. Auto-scrolls. New events slide in from top. Max 50 items (virtualised). Mobile: collapsible drawer.

7. **`Leaderboard`** — top players in game. Props: `{ players: LeaderboardEntry[], currentUserId }`. Current user highlighted in accent color.

8. **`AdPlayer`** — video player wrapper. Props: `{ streamId, duration, minWatchSec, onProgress, onComplete }`. Uses Cloudflare Stream embed. Tracks watch time. Cannot seek forward. Shows credit accumulation overlay.

9. **`WinOverlay`** — full-screen win/loss screen. Props: `{ type: 'win' | 'loss', amount?, winnerHandle, onClaim, onPlayAgain }`. Win: gold confetti animation (pure CSS, no library). Loss: shows winner handle.

10. **`ClicksRemaining`** — pill showing remaining clicks. Props: `{ count, total }`. Color shifts as clicks run low. Pulse animation when 3 or fewer remain.

11. **`Ticker`** — horizontal scrolling announcement bar. Props: `{ events: TickerEvent[] }`. CSS animation only, no JS scroll. Auto-duplicates content for seamless loop.

12. **`Modal`** — accessible modal. Traps focus. ESC to close. Portal rendered.

13. **`SkeletonCard`** — loading skeleton that matches GameCard dimensions.

14. **`StatBadge`** — small label+value display. Props: `{ label, value, variant }`.

#### Export all from `src/index.ts`. Ship with full TypeScript types. No runtime CSS-in-JS.

---

### AGENT 3 — Next.js Web Application
**Package:** `apps/web`
**Depends on:** Agent 1 (db), Agent 2 (ui)
**Blocks:** Agent 6 (ad system routes live here)

#### Setup

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-import-alias
pnpm add @qliqr/db @qliqr/ui @qliqr/game-engine
pnpm add @clerk/nextjs socket.io-client @upstash/redis zustand @tanstack/react-query
pnpm add cloudflare-stream-react stripe @stripe/stripe-js
pnpm add posthog-js @sentry/nextjs
```

#### next.config.ts

```typescript
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  transpilePackages: ['@qliqr/ui', '@qliqr/db', '@qliqr/game-engine'],
  experimental: { ppr: true },           // Partial Pre-rendering
  images: { domains: ['imagedelivery.net', 'customer.cloudflarestream.com'] },
}
export default nextConfig
```

#### App Directory Structure

```
app/
├── layout.tsx              ← Root layout: ClerkProvider, QueryProvider, PostHog
├── page.tsx                ← Lobby (Server Component — fetch active games)
├── game/
│   └── [id]/
│       ├── page.tsx        ← Game page shell (Server Component — metadata)
│       ├── WatchAd.tsx     ← Client Component — ad viewing flow
│       └── GameRoom.tsx    ← Client Component — live game
├── winners/
│   └── page.tsx            ← Hall of Fame (ISR, revalidate: 60)
├── how-it-works/
│   └── page.tsx            ← Static informational page
├── profile/
│   └── page.tsx            ← User profile, win history, referral link
├── api/
│   ├── games/
│   │   ├── route.ts        ← GET /api/games (paginated game list)
│   │   └── [id]/
│   │       ├── route.ts    ← GET /api/games/[id]
│   │       ├── join/route.ts     ← POST — credit clicks after ad view
│   │       └── history/route.ts  ← GET — recent click history
│   ├── ads/
│   │   ├── start/route.ts        ← POST — init ad session
│   │   ├── heartbeat/route.ts    ← POST — ad watch progress
│   │   └── complete/route.ts     ← POST — ad finished, credit clicks
│   ├── user/
│   │   ├── me/route.ts
│   │   ├── payout-setup/route.ts
│   │   └── winnings/route.ts
│   ├── webhooks/
│   │   ├── clerk/route.ts        ← Clerk user created/updated
│   │   └── stripe/route.ts       ← Stripe payment events
│   └── og/
│       └── win/[gameId]/route.tsx ← Dynamic OG image for win share
└── globals.css
```

#### Lobby Page (app/page.tsx) — Server Component

```typescript
// Fetch from Supabase + Redis. Cache for 15 seconds.
// Render: hero section, how-it-works strip, game grid
// Game grid: infinite scroll via client component after initial RSC render
// Show skeleton cards while loading additional games
// Sort: by prize pool desc (biggest prizes first)
```

The lobby must:
- Load first 12 games server-side (RSC)
- Infinite scroll loads more via `/api/games?page=N&limit=12`
- Show real-time pool updates via a lightweight polling mechanism (every 10s) OR connect to `/lobby` socket namespace for push updates
- Display a live ticker at the top showing recent winners
- Be fully usable with JavaScript disabled (SSR fallback shows static game list)

#### Game Page (app/game/[id]/page.tsx)

Server component that:
1. Fetches game + campaign data
2. Generates metadata including og:image
3. Checks if game is active (redirect to lobby if ended)
4. Renders `<WatchAd>` or `<GameRoom>` based on whether user has clicks in this game

#### WatchAd Client Component

State machine (use a Zustand slice):
```
IDLE → LOADING → PLAYING → PAUSED → COMPLETED → CREDITED → ERROR
                     ↓         ↑
               FOCUS_LOST → RESUMED
```

Key behaviors:
- Call `POST /api/ads/start` on mount — receive signed session token
- Send `POST /api/ads/heartbeat` every 5 seconds with `{ token, secondsWatched }`
- On tab blur: pause credit accumulation, set `PAUSED` state
- On tab focus: resume from where left off, set `PLAYING`
- Disable scrubbing forward in Cloudflare player
- Show real-time credit counter (clicking up every second)
- Enable "Enter Game" button after `minWatchSec` seconds
- On enter: call `POST /api/ads/complete`, receive click credits, transition to GameRoom
- Full completion (+10% bonus clicks) shown as celebration animation

#### GameRoom Client Component

This is the most complex component. Architecture:

```typescript
// useGameSocket.ts — custom hook
// Manages Socket.io connection to ws-server
// Handles: connect, disconnect, reconnect with exponential backoff
// Subscribes to all game:* events
// Exposes: { state, sendClick, connectionStatus }

// useOptimisticTimer.ts — custom hook  
// Runs local 1-second countdown in sync with server
// On game:tick, reconcile local with server value (snap if diff > 2s)
// On game:reset, immediately snap to 30

// useClickManager.ts — custom hook
// Tracks clicks remaining (from Redis via initial state)
// Prevents clicks when 0 remaining
// Triggers haptic feedback
// Debounces to prevent double-clicks
```

UI layout (mobile-first CSS Grid):
```
[Header: sponsor name, clicks remaining, back button]  56px
[Prize pool counter — large, gold, animated]           80px
[Countdown ring — center, SVG, full width]             flex-1
[Click button — bottom third, thumb zone]              120px
[Bottom bar: leaderboard toggle, feed toggle]          60px
```

#### API Routes — Key Implementation Details

**POST /api/ads/start:**
```typescript
// 1. Verify Clerk auth
// 2. Check: has user already viewed this campaign today? (Redis dedup)
// 3. Check: IP rate limit (max 20 views/hour via Redis INCR)
// 4. Create ad_view record in DB (status: in_progress)
// 5. Generate HMAC-signed session token: { userId, campaignId, gameId, iat, adViewId }
// 6. Return: { token, videoStreamId, duration, minWatchSec, currentPool }
```

**POST /api/ads/heartbeat:**
```typescript
// 1. Verify HMAC token signature
// 2. Validate timestamp cadence (must be 4-6s since last heartbeat)
// 3. Increment Redis counter: ad_session:{adViewId}:seconds
// 4. Check tab visibility flag in payload
// 5. Return: { secondsWatched, clicksEarned, poolPreview }
// If invalid: return 400, mark session as suspect
```

**POST /api/ads/complete:**
```typescript
// 1. Verify HMAC token
// 2. Final seconds count from Redis
// 3. Calculate: clicksEarned = secondsWatched (+ 10% if completed)
// 4. Calculate: revenueGross = secondsWatched * cpvRate
// 5. Calculate: poolContribution = revenueGross * poolPct / 100
// 6. Atomic DB transaction:
//    a. INSERT ad_view record (completed)
//    b. UPDATE campaign SET budget_spent = budget_spent + revenueGross
//    c. UPDATE game SET prize_pool = prize_pool + poolContribution
// 7. SET Redis: user:{userId}:clicks:{gameId} = clicksEarned (with 24h TTL)
// 8. ZADD lobby:active_games gameId score=newPool
// 9. Return: { clicksEarned, prizePool, gameId }
```

#### Zustand Stores

```typescript
// stores/gameStore.ts
interface GameStore {
  state: LiveGameState | null
  myClicks: number
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  lastClickerHandle: string | null
  leaderboard: LeaderboardEntry[]
  feed: FeedEvent[]
  // actions
  setGameState: (state: LiveGameState) => void
  handleClick: (event: ClickEvent) => void
  handleWin: (event: WinEvent) => void
  handleTick: (timer: number) => void
  decrementMyClicks: () => void
}

// stores/userStore.ts
interface UserStore {
  user: User | null
  clicksByGame: Record<string, number>  // gameId → clicks remaining
  setUser: (user: User) => void
  setClicksForGame: (gameId: string, clicks: number) => void
  decrementClicks: (gameId: string) => void
}
```

#### PWA Configuration

Create `public/manifest.json`:
```json
{
  "name": "qliqr — The Last Click",
  "short_name": "qliqr",
  "description": "Watch ads. Get clicks. Win cash.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#e8ff00",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Create `public/sw.js` (service worker):
- Cache lobby page shell for offline
- Handle push notification events
- Show notification: title, body, click → open game URL

#### Dynamic OG Image (app/api/og/win/[gameId]/route.tsx)

Use `@vercel/og` with ImageResponse. Design:
- Dark background with gold accent
- Large text: "$X,XXX" (amount won)
- Sponsor logo/name in corner
- "qliqr.com — The Last Click" branding
- Winner handle in gold
- Size: 1200×630

---

### AGENT 4 — WebSocket Server
**Package:** `apps/ws-server`
**Depends on:** Agent 1 (db), Agent 5 (game-engine)
**Deployed:** Fly.io

#### Setup

```bash
cd apps/ws-server
pnpm init
pnpm add socket.io @upstash/redis @qliqr/db @qliqr/game-engine
pnpm add @clerk/backend ioredis jsonwebtoken
pnpm add -D typescript tsx @types/node
```

#### Server Structure

```
apps/ws-server/src/
├── index.ts              ← Server entry point
├── namespaces/
│   ├── game.ts           ← /game namespace handler
│   └── lobby.ts          ← /lobby namespace handler
├── handlers/
│   ├── clickHandler.ts   ← Click processing pipeline
│   ├── winHandler.ts     ← Win detection and declaration
│   └── timerHandler.ts   ← Redis keyspace expiry listener
├── services/
│   ├── redis.ts          ← Upstash Redis client + helpers
│   ├── gameState.ts      ← Read/write live game state
│   ├── auth.ts           ← JWT verification via Clerk JWKS
│   └── qstash.ts         ← Enqueue async jobs
└── orchestrator/
    └── gameOrchestrator.ts ← Auto-spawn game rooms
```

#### index.ts

```typescript
import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupGameNamespace } from './namespaces/game'
import { setupLobbyNamespace } from './namespaces/lobby'
import { startTimerWatcher } from './handlers/timerHandler'
import { startOrchestrator } from './orchestrator/gameOrchestrator'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.WEB_URL!, process.env.SPONSOR_URL!],
    credentials: true,
  },
  transports: ['websocket', 'polling'],   // polling as fallback for strict firewalls
  pingTimeout: 20000,
  pingInterval: 25000,
})

setupGameNamespace(io)
setupLobbyNamespace(io)
startTimerWatcher(io)     // Redis keyspace notification listener
startOrchestrator()       // Game auto-spawn loop

httpServer.listen(process.env.PORT || 3001)
console.log(`WS Server running on port ${process.env.PORT || 3001}`)
```

#### Click Processing Pipeline (handlers/clickHandler.ts)

Implement this pipeline with < 5ms target (measured from event receipt to broadcast):

```typescript
export async function processClick(
  socket: Socket,
  payload: { gameId: string },
  io: Server
): Promise<void> {
  const userId = socket.data.userId  // Set during auth middleware

  // Step 1: Decrement user click balance (atomic)
  const remaining = await redis.decr(`user:${userId}:clicks:${payload.gameId}`)
  if (remaining < 0) {
    await redis.incr(`user:${userId}:clicks:${payload.gameId}`)  // restore
    socket.emit('click:rejected', { reason: 'no_clicks_remaining' })
    return
  }

  // Step 2: Rate limit — max 1 click per 500ms per user per game
  const rateLimitKey = `ratelimit:click:${userId}:${payload.gameId}`
  const isRateLimited = await redis.set(rateLimitKey, '1', { nx: true, px: 500 })
  if (!isRateLimited) {
    await redis.incr(`user:${userId}:clicks:${payload.gameId}`)  // restore
    socket.emit('click:rejected', { reason: 'rate_limited' })
    return
  }

  // Step 3: Get sequence number (atomic)
  const seq = await redis.incr(`game:${payload.gameId}:click_seq`)

  // Step 4: Update last clicker
  await redis.set(`game:${payload.gameId}:last_clicker`, userId)

  // Step 5: Reset timer (TTL = 30 seconds — this IS the timer)
  await redis.set(`game:${payload.gameId}:timer`, '30', { ex: 30 })

  // Step 6: Increment click counts
  await redis.hincrby(`game:${payload.gameId}:click_counts`, userId, 1)

  // Step 7: Build click event
  const clickEvent: ClickEvent = {
    userId,
    handle: socket.data.handle,
    countryCode: socket.data.countryCode,
    gameId: payload.gameId,
    seq,
    timerAtClick: 30,  // just reset
    timestamp: Date.now(),
  }

  // Step 8: Broadcast to room (via Redis pub/sub for multi-server)
  await redis.publish(`game:${payload.gameId}`, JSON.stringify({
    type: 'game:click',
    payload: clickEvent,
  }))

  // Step 9: Async DB write (non-blocking — fire and forget with retry)
  enqueueClickWrite(clickEvent).catch(console.error)
}
```

#### Win Detection (handlers/timerHandler.ts)

```typescript
import { createClient } from 'redis'  // ioredis for keyspace notifications

export function startTimerWatcher(io: Server) {
  // Connect separate Redis client for keyspace notifications
  // Upstash doesn't support keyspace notifications via REST
  // Use a self-hosted Redis or Fly.io Redis for this
  const subscriber = createClient({ url: process.env.REDIS_KEYSPACE_URL })

  subscriber.subscribe('__keyevent@0__:expired', async (key) => {
    if (!key.startsWith('game:') || !key.endsWith(':timer')) return

    const gameId = key.split(':')[1]

    // Distributed lock — only one server processes the win
    const lockKey = `game:${gameId}:win_lock`
    const acquired = await redis.set(lockKey, '1', { nx: true, ex: 10 })
    if (!acquired) return  // Another server is handling this

    try {
      const lastClickerId = await redis.get(`game:${gameId}:last_clicker`)
      if (!lastClickerId) return  // No clicks were made — shouldn't happen

      const [winnerHandle, poolStr] = await Promise.all([
        redis.get(`user:${lastClickerId}:handle`),
        redis.get(`game:${gameId}:pool`),
      ])

      const amount = Math.round(parseFloat(poolStr || '0') * 100)  // to cents

      const winEvent: WinEvent = {
        gameId,
        winnerId: lastClickerId,
        winnerHandle: winnerHandle || 'Unknown',
        amount,
        totalClicks: parseInt(await redis.get(`game:${gameId}:click_seq`) || '0'),
        gameDurationMs: 0,  // calculate from startedAt
      }

      // Broadcast win to all players in room
      io.of('/game').to(gameId).emit('game:won', winEvent)

      // Update lobby
      io.of('/lobby').emit('game:ended', { gameId, winEvent })

      // Enqueue payout job
      await enqueuePayout(winEvent)

      // Update DB (async)
      await enqueueGameEnd(winEvent)

    } finally {
      // Lock auto-expires in 10s — no manual cleanup needed
    }
  })
}
```

#### Game Orchestrator (orchestrator/gameOrchestrator.ts)

```typescript
// Runs every 10 seconds
// For each active campaign:
//   1. Count active games for campaign
//   2. If count < maxConcurrentGames AND budget remaining > 0:
//      a. Generate unique room_code (6 chars, alphanumeric, no ambiguous chars)
//      b. INSERT new game into DB
//      c. Initialize Redis keys for game
//      d. ZADD lobby:active_games with initial pool score
//      e. Publish 'game:new' to lobby channel
```

#### Fly.io Configuration (infra/fly.toml)

```toml
app = "qliqr-ws"
primary_region = "iad"

[build]
  dockerfile = "apps/ws-server/Dockerfile"

[env]
  PORT = "3001"
  NODE_ENV = "production"

[[services]]
  internal_port = 3001
  protocol = "tcp"
  [services.concurrency]
    hard_limit = 50000
    soft_limit = 40000
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  [[services.ports]]
    port = 80
    handlers = ["http"]
  [services.http_checks]
    interval = "10s"
    timeout = "2s"
    path = "/health"

[[regions]]
  regions = ["iad", "lhr", "sin", "nrt", "gru", "syd"]

[mounts]
  # No persistent storage — fully stateless
```

---

### AGENT 5 — Game Engine Package
**Package:** `packages/game-engine`
**Depends on:** Agent 1 (types from db)
**Blocks:** Agents 3, 4

This package contains **pure business logic** — no I/O, no framework dependencies, no side effects. It must be runnable in both Node.js (WS server) and the browser (optimistic UI).

```typescript
// src/timer.ts
export class GameTimer {
  private seconds: number
  private maxSeconds: number
  private interval: ReturnType<typeof setInterval> | null = null
  private onTick: (seconds: number) => void
  private onExpire: () => void

  constructor(config: { maxSeconds: number; onTick: (s: number) => void; onExpire: () => void }) { ... }

  reset(toSeconds?: number): void { ... }
  start(): void { ... }
  stop(): void { ... }
  sync(serverSeconds: number): void {
    // Reconcile local timer with server value
    // Only snap if difference > 2 seconds (tolerate network jitter)
    if (Math.abs(this.seconds - serverSeconds) > 2) {
      this.seconds = serverSeconds
    }
  }
  get current(): number { return this.seconds }
}

// src/clickValidator.ts
export function validateClick(params: {
  userId: string
  gameId: string
  clicksRemaining: number
  lastClickTime: number
  minIntervalMs: number  // 500ms
}): { valid: boolean; reason?: string } { ... }

// src/poolCalculator.ts
export function calculatePoolContribution(params: {
  secondsWatched: number
  cpvRate: number  // $ per second
  poolPct: number  // percentage (25 = 25%)
}): { gross: number; poolContribution: number; platformRevenue: number } { ... }

// src/fraudScorer.ts
export function scoreFraud(signals: {
  heartbeatCadenceVariance: number[]  // Should be near 5s each
  tabFocusRatio: number               // 0-1, should be near 1
  ipViewCount: number                 // Views from this IP in last hour
  fingerprintMatchCount: number       // How many accounts share fingerprint
  deviceMotionPresent: boolean        // Mobile devices should have this
}): number { ... }  // Returns 0-1, higher = more suspicious

// src/roomCode.ts
export function generateRoomCode(): string {
  // 6 chars, alphanumeric, no 0/O/I/l ambiguity
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// src/leaderboard.ts
export function buildLeaderboard(clickCounts: Record<string, number>): LeaderboardEntry[] {
  return Object.entries(clickCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, clicks], idx) => ({ rank: idx + 1, userId, clicks }))
}
```

Write comprehensive Vitest tests for every function. Target 100% coverage on this package — it's the most critical logic in the platform.

---

### AGENT 6 — Ad System & Fraud Detection
**Package:** `apps/web/src/` (extends Agent 3's app)
**Depends on:** Agent 3 (web app routes), Agent 5 (game engine fraud scorer)

#### Complete the ad API routes:

**POST /api/ads/start — Full Implementation:**

```typescript
// Security checks (in order, fail fast):
// 1. Rate limit by IP: max 20 ad starts per IP per hour
//    Key: ratelimit:ads:start:{ipHash} — INCR with 1h TTL
// 2. Duplicate view check: 1 view per (userId, campaignId) per 24h
//    Query: SELECT id FROM ad_views WHERE user_id=? AND campaign_id=? AND created_at > NOW()-24h
// 3. Campaign budget check: budget_spent < budget_cap
// 4. Campaign active check: status='active', starts_at < NOW(), ends_at > NOW() (or null)
// 5. User not banned check

// Generate HMAC-signed session token:
// payload = { userId, campaignId, gameId, adViewId, iat, maxSeconds }
// signature = HMAC-SHA256(JSON.stringify(payload), AD_SESSION_HMAC_SECRET)
// token = base64(payload) + '.' + signature
```

**Heartbeat Validation:**

```typescript
// Track heartbeat timing:
// Store timestamps in Redis: ad_session:{adViewId}:heartbeats (List, RPUSH)
// On each heartbeat:
//   1. Get last heartbeat time
//   2. Gap must be 4-6 seconds (5 ± 1s tolerance)
//   3. If gap > 10s: mark session suspect, emit warning but continue
//   4. If gap > 30s: invalidate session
//   5. Track tab focus events from client payload
```

**Fraud Scoring (run async on ad_view completion):**

```typescript
// Enqueue as QStash job after ad complete
// Job fetches: all heartbeat data, IP view count, fingerprint matches
// Calls fraudScorer from game-engine package
// Updates ad_view.fraud_score
// If score > 0.95: reverse the click credits (DECRBY Redis)
// If score > 0.80: flag for manual review, hold payout if game won
```

#### Clickhouse Event Ingestion

On every ad_view completion, send event to Clickhouse:

```typescript
interface AdViewEvent {
  event_time: DateTime
  user_id: string
  campaign_id: string
  game_id: string
  sponsor_id: string
  seconds_watched: number
  completed: boolean
  fraud_score: number
  revenue_gross: number
  pool_contribution: number
  country_code: string
  device_type: 'mobile' | 'desktop' | 'tablet'
}
```

Clickhouse table (create via HTTP API on service init):

```sql
CREATE TABLE ad_view_events (
  event_time DateTime,
  user_id String,
  campaign_id String,
  game_id String,
  sponsor_id String,
  seconds_watched UInt16,
  completed UInt8,
  fraud_score Float32,
  revenue_gross Float64,
  pool_contribution Float64,
  country_code FixedString(2),
  device_type Enum('mobile'=1, 'desktop'=2, 'tablet'=3)
) ENGINE = MergeTree()
ORDER BY (campaign_id, event_time)
PARTITION BY toYYYYMM(event_time)
```

---

### AGENT 7 — Sponsor Dashboard
**Package:** `apps/sponsor`
**Depends on:** Agent 1 (db), Agent 2 (ui)

Separate Next.js app at `sponsor.qliqr.com`. Clerk org-based auth.

#### Pages to build:

**Dashboard Home (`/`):**
- Active campaigns grid
- Total spend, total views, total pool generated (last 30 days)
- Quick-start CTA if no campaigns

**Campaign Creation (`/campaigns/new`):**
Step-by-step wizard using URL state (`?step=1`):

Step 1 — Basics:
```
Campaign Name [text input]
Product Tagline [text input, 80 chars max]
Click-Through URL [url input]
```

Step 2 — Video Upload:
```
Drag-drop zone → direct upload to Cloudflare Stream
Progress bar during upload + transcode
Auto-detect duration (must be 30-300 seconds)
Preview player shown after upload
Minimum watch seconds: [slider, 5-60, default: 5]
```

Step 3 — Economics:
```
CPV Rate: $[0.001]–[$0.100] per second watched
          [slider with presets: Budget ($0.01), Standard ($0.03), Premium ($0.07)]
Total Budget Cap: $[100]–[$100,000]
Max Prize Pool Per Game: $[leave blank for auto]
Concurrent Games: [1-10, default: 1]
```

Step 4 — Targeting:
```
Geographic targeting: [multi-select country list, default: global]
Schedule: [optional start/end datetime]
```

Step 5 — Funding & Launch:
```
Summary of settings
Estimated reach: [calculated from budget/cpv]
Fund campaign via Stripe Checkout
Auto-approve once funded (< $500 budget) or manual review (> $500)
```

**Campaign Detail (`/campaigns/[id]`):**

Real-time analytics dashboard. Poll Clickhouse every 30 seconds.

Charts to implement (use Recharts):
1. Views over time (line chart, hourly)
2. Watch duration distribution (histogram: 0-30%, 30-60%, 60-90%, 90-100%)
3. Geographic distribution (table with country flags + view counts)
4. Budget burn rate (area chart: spent vs. remaining)
5. Pool growth over time (line chart)

Key metrics displayed prominently:
```
Total Impressions | Completion Rate | Avg Watch Duration
Cost Per Engaged View | Games Spawned | Total Pool Generated
Budget Spent | Budget Remaining | Winners Paid
```

**Billing (`/billing`):**
- Stripe Customer Portal redirect (no custom billing UI needed)
- Current active campaigns and spend
- Payout history

---

### AGENT 8 — Payments & Payouts
**Package:** `apps/web/src/` (Stripe routes) + QStash job handlers
**Depends on:** Agent 3 (web app), Agent 1 (db)

#### Sponsor Billing

**Stripe Webhook Handler (`/api/webhooks/stripe`):**

Events to handle:
```typescript
'checkout.session.completed'  → Fund campaign wallet, update campaign status to 'active'
'invoice.payment_succeeded'   → Record payment, update budget
'invoice.payment_failed'      → Pause campaign, notify sponsor via email
'customer.subscription.deleted' → Suspend campaign
```

**Campaign Funding Flow:**
1. Sponsor submits campaign form
2. POST `/api/sponsor/campaigns` → create campaign with status='draft'
3. POST `/api/sponsor/checkout` → create Stripe Checkout session with metadata: `{ campaignId }`
4. Stripe redirects back to `/campaigns/[id]?funded=true`
5. Webhook `checkout.session.completed` → update campaign status to 'active'

#### Winner Payouts (QStash Job)

Create job handler at `/api/jobs/payout`:

```typescript
// This endpoint is called by QStash — verify QStash signature first
// Job payload: WinEvent

export async function POST(req: Request) {
  // 1. Verify QStash signature
  const signature = req.headers.get('Upstash-Signature')
  await verifyQStashSignature(signature, await req.text())

  const winEvent: WinEvent = await req.json()

  // 2. Idempotency check — has this payout already been processed?
  const existing = await db.select().from(payouts).where(eq(payouts.gameId, winEvent.gameId))
  if (existing.length > 0 && existing[0].status !== 'failed') return Response.json({ ok: true })

  // 3. Insert/update payout record
  await db.insert(payouts).values({
    gameId: winEvent.gameId,
    winnerId: winEvent.winnerId,
    amount: (winEvent.amount / 100).toString(),  // convert from cents
    status: 'processing',
  }).onConflictDoNothing()

  // 4. Fraud hold check — winnings > $500 held for 7 days
  if (winEvent.amount > 50000) {  // > $500 in cents
    await db.update(payouts).set({ status: 'held', heldReason: 'amount_review' })
    await sendEmail({ to: winEvent.winnerEmail, template: 'win-held', data: winEvent })
    return Response.json({ ok: true, held: true })
  }

  // 5. Check if winner has Stripe Connect account
  const winner = await db.select().from(users).where(eq(users.id, winEvent.winnerId))
  if (!winner[0].stripeAccountId) {
    // Hold winnings — send email to set up payout account
    await db.update(payouts).set({ status: 'held', heldReason: 'no_stripe_account' })
    await sendEmail({ to: winner[0].email, template: 'win-setup-payout', data: { ...winEvent, claimUrl: `https://qliqr.com/profile?claim=${winEvent.gameId}` } })
    return Response.json({ ok: true, held: true })
  }

  // 6. Execute Stripe transfer
  const transfer = await stripe.transfers.create({
    amount: winEvent.amount,
    currency: 'usd',
    destination: winner[0].stripeAccountId,
    metadata: { gameId: winEvent.gameId, winnerHandle: winEvent.winnerHandle },
  })

  // 7. Update payout record
  await db.update(payouts).set({
    stripeTransferId: transfer.id,
    status: 'paid',
    completedAt: new Date(),
  })

  // 8. Update user stats
  await db.update(users).set({
    totalWinnings: sql`total_winnings + ${winEvent.amount / 100}`,
    gamesWon: sql`games_won + 1`,
  }).where(eq(users.id, winEvent.winnerId))

  // 9. Send winner email + push notification
  await Promise.all([
    sendEmail({ to: winner[0].email, template: 'win-paid', data: winEvent }),
    sendPushNotification({ userId: winEvent.winnerId, title: `You won $${winEvent.amount / 100}!`, body: 'Your prize has been sent.' }),
  ])

  return Response.json({ ok: true })
}
```

---

### AGENT 9 — Viral Growth & Notifications
**Package:** `apps/web/src/` (extends Agent 3's app)
**Depends on:** Agent 3, Agent 8

#### Referral System

**Schema addition** (migration via Agent 1's pattern):
- `users.referrer_id` column already in schema (see Agent 1)
- `referrals` table already defined

**Implementation:**

```typescript
// Referral link: qliqr.com/ref/[handle]
// app/ref/[handle]/route.ts — redirect to lobby with ref cookie
// On user registration (Clerk webhook): check ref cookie, create referral record
// On first ad view completion: award bonus clicks
//   Referrer: +5 clicks on next game (stored in Redis with 7-day TTL)
//   Referred: +10 clicks on first game join (auto-applied)
```

**Referral Dashboard on Profile Page:**
- Your referral link (copy button)
- Count of referred users
- Total bonus clicks earned from referrals
- Top 3 most active referred users (gamified)

#### Push Notifications (OneSignal)

```typescript
// services/push.ts
import OneSignal from '@onesignal/node-onesignal'

const client = OneSignal.createConfiguration({ appKey: process.env.ONESIGNAL_API_KEY })

export async function sendPushNotification(params: {
  userId?: string       // target specific user
  segment?: string      // or a segment
  title: string
  body: string
  url?: string
  data?: Record<string, string>
}): Promise<void> { ... }

// Notification types to implement:
// 1. 'game:won' — You won $X!
// 2. 'game:near_miss' — You were last clicker for Xs before someone knocked you off
// 3. 'game:ending' — A game you're in has < 10s left
// 4. 'game:new' — New [Sponsor] game started with $X pool (for followed sponsors)
// 5. 'payout:sent' — Your $X prize has been sent
// 6. 'referral:joined' — [Handle] joined using your referral link (+5 clicks)
```

#### Winner Announcement Engine

On every win event (triggered from WS server via QStash):

```typescript
// jobs/announceWin.ts
// 1. Generate shareable URL: qliqr.com/win/[gameId]
// 2. This URL serves the dynamic OG image (see Agent 3)
// 3. Construct tweet text:
//    "🏆 [Handle] just won $X watching a @[Sponsor] ad on qliqr.com
//     Play free → watch 60s, get clicks, win cash
//     qliqr.com/game/[id] 🔥"
// 4. Update lobby ticker via Redis pub/sub
// 5. Update Hall of Fame (sorted set in Redis: winners:{all_time} sorted by amount)
// 6. Send push to all users who have 'winner_alerts' enabled
```

#### Hall of Fame Page (`/winners`)

```typescript
// ISR page, revalidate every 60 seconds
// Data from Redis sorted set (top 100 all-time winners)
// Display: animated table, winner handle, amount, sponsor, game date
// "Top Winners This Week" and "All Time" tabs
// Each row is shareable
```

#### Email Templates (React Email)

Create templates in `packages/email-templates/`:

1. **`win-paid.tsx`** — "You won $X! Funds sent to your account."
2. **`win-held.tsx`** — "You won $X! We're reviewing your prize (should be 7 days)."
3. **`win-setup-payout.tsx`** — "You won $X! Set up your payout account to claim."
4. **`welcome.tsx`** — "Welcome to qliqr. Here's how to win."
5. **`weekly-recap.tsx`** — "Your qliqr week: X clicks, X games, X winnings."
6. **`referral-joined.tsx`** — "[Handle] joined using your link. You earned 5 bonus clicks."
7. **`sponsor-budget-low.tsx`** — "Your campaign budget is 20% remaining."
8. **`sponsor-game-won.tsx`** — "Someone won your [CampaignName] game!"

All emails include current live games footer (fetched at send time).

---

### AGENT 10 — DevOps, CI/CD & Monitoring
**Depends on:** All other agents
**Creates:** Infrastructure configs, GitHub Actions, monitoring setup

#### GitHub Actions (`.github/workflows/`)

**`ci.yml`** — runs on every PR:
```yaml
jobs:
  lint: pnpm lint
  typecheck: pnpm typecheck
  test: pnpm test (Vitest)
  build: pnpm build (check no build errors)
```

**`deploy.yml`** — runs on push to main:
```yaml
jobs:
  test: (same as ci.yml)
  db-migrate:
    needs: test
    run: pnpm db:migrate --env production
    # Uses DATABASE_URL secret from GitHub
  deploy-ws:
    needs: db-migrate
    run: flyctl deploy --app qliqr-ws --remote-only
  # Vercel auto-deploys via GitHub integration — no action needed
```

**`load-test.yml`** — runs weekly on schedule:
```yaml
# k6 load test script
# Target: 10K concurrent WebSocket connections
# Measure: click-to-broadcast p50/p95/p99 latency
# Fail if: p99 > 200ms
```

#### Sentry Configuration

In each app's entry point:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()],
})
```

Custom Sentry alerts:
- Error rate > 1% on any API route → Slack alert
- WS disconnect rate > 5% in 5min window → Slack alert
- Payout failure → PagerDuty page

#### Health Check Endpoints

Add to WS server (`/health`):
```typescript
// Returns 200 with { status: 'ok', uptime, connectedClients, activeGames, redisLatencyMs }
// Fly.io uses this for health checks
```

Add to web app (`/api/health`):
```typescript
// Returns 200 with { status: 'ok', dbLatencyMs, redisLatencyMs }
// Used by Vercel health checks
```

---

## 6. APPROVED PACKAGE LIST

Only install packages explicitly listed in Section 3 or listed below. Document any additions in BUILD_LOG.md.

```
# Utility
lodash-es, date-fns, zod (validation), nanoid

# Dev only
@types/*, vitest, playwright, @playwright/test, dotenv,
tsx, turbo, eslint, prettier, @biomejs/biome, husky, lint-staged

# UI
recharts (sponsor dashboard charts), react-email, framer-motion (win overlay only)
lucide-react (icons), class-variance-authority, clsx, tailwind-merge

# Not allowed
moment.js, axios (use native fetch), lodash (use lodash-es),
any jQuery, any bootstrap/material-ui (use custom components)
```

---

## 7. ENVIRONMENT VARIABLES

Every agent should reference this list. No hardcoded values anywhere.

### apps/web/.env.local

```bash
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database
DATABASE_URL=                              # Supabase connection string (pooled)
DIRECT_URL=                               # Supabase direct connection (for migrations)

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Real-time
NEXT_PUBLIC_WS_URL=http://localhost:3001   # ws-server URL

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_STREAM_API_TOKEN=
NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE=  # For embed player

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Jobs
QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Ad fraud
AD_SESSION_HMAC_SECRET=                   # 32-byte hex string
NEXT_PUBLIC_FINGERPRINT_API_KEY=          # FingerprintJS Pro

# Analytics
CLICKHOUSE_HOST=
CLICKHOUSE_USER=
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=qliqr

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Notifications
ONESIGNAL_APP_ID=
ONESIGNAL_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@qliqr.com

# Error tracking
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### apps/ws-server/.env

```bash
PORT=3001
NODE_ENV=development
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_KEYSPACE_URL=redis://localhost:6379   # Self-hosted Redis for keyspace events
CLERK_JWKS_URL=                            # Clerk JWKS endpoint
QSTASH_TOKEN=
DATABASE_URL=
WEB_URL=http://localhost:3000
SPONSOR_URL=http://localhost:3002
SENTRY_DSN=
```

---

## 8. CODING STANDARDS

All agents MUST follow these standards. Orchestrator enforces.

### TypeScript

```typescript
// ✅ Always use strict mode
// tsconfig.json: { "strict": true, "noUncheckedIndexedAccess": true }

// ✅ Explicit return types on all functions
async function processClick(gameId: string, userId: string): Promise<void> { }

// ✅ Zod for all external input validation
const clickPayload = z.object({ gameId: z.string().uuid() })

// ❌ Never use `any`
// ❌ Never use non-null assertion `!` without a comment explaining why
// ❌ Never suppress TypeScript errors with @ts-ignore
```

### Error Handling

```typescript
// ✅ Always use Result type pattern for operations that can fail
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

// ✅ Log errors with context
console.error('[processClick] Failed to decrement click balance', { userId, gameId, error })

// ✅ API routes always return consistent error shape
return Response.json({ error: 'rate_limited', message: 'Too many clicks' }, { status: 429 })
```

### Performance Rules

```typescript
// ✅ Never block the click processing pipeline with DB writes
// Use QStash for all Postgres writes during active gameplay

// ✅ Optimistic UI for click feedback — update local state immediately
// Don't wait for server ack before showing click animation

// ✅ Use Redis for all reads during active game (never Postgres)

// ✅ Debounce analytics events — batch Clickhouse writes every 5s
```

### Security Rules

```typescript
// ✅ Validate auth on every API route — no exceptions
const { userId } = await auth()
if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

// ✅ Sanitize all user inputs before DB insert
// Use Drizzle's parameterized queries exclusively — no raw SQL

// ✅ Hash IPs before storing: sha256(ip + IP_HASH_SALT)

// ✅ Rate limit every public API route using Redis
```

---

## 9. MOBILE-FIRST REQUIREMENTS

Every UI component must satisfy:

- **Touch targets:** Minimum 44×44px (click button: minimum 80×80px)
- **Thumb zone:** Primary action (click button) in bottom 40% of viewport
- **Font sizes:** Minimum 16px for body text (prevents iOS zoom on focus)
- **Tap feedback:** Visual + haptic on every interactive element
- **No hover-only interactions:** All hover states have equivalent tap states
- **iOS Safe Areas:** Use `env(safe-area-inset-*)` for notch/home indicator spacing
- **Landscape mode:** Game room must be playable in landscape (timer + button always visible)
- **Offline handling:** Show clear "You're offline" banner, disable click button gracefully
- **Connection quality:** If WS latency > 500ms, show "High latency" warning

**Test on:**
- iPhone 14 (390×844)
- iPhone SE (375×667)  
- Samsung Galaxy S21 (360×800)
- iPad Air (820×1180)

---

## 10. VALIDATION CHECKLISTS

Orchestrator runs these after each agent completes.

### After Agent 1 (Database):
- [ ] `pnpm db:migrate` runs without errors
- [ ] `pnpm db:seed` populates all tables
- [ ] All foreign keys are correct (test with a JOIN query)
- [ ] All indexes exist (check pg_indexes)
- [ ] Types exported from `packages/db/src/types.ts` are complete
- [ ] `InferSelectModel` and `InferInsertModel` for all tables exported

### After Agent 2 (UI):
- [ ] All 13 components render without errors in isolation
- [ ] `GameCard` timer ticks in real-time (not just on re-render)
- [ ] `ClickButton` touch target is ≥ 80px at all viewport sizes
- [ ] `CountdownRing` uses `requestAnimationFrame` (check DevTools Performance)
- [ ] All components pass TypeScript strict mode
- [ ] Storybook or isolated test renders available

### After Agent 3 (Web App):
- [ ] `pnpm dev` starts without errors
- [ ] Lobby loads and shows game cards
- [ ] Ad watch flow: credits tick up every second
- [ ] Game room: WebSocket connects, timer ticks
- [ ] Click button: click deducts from remaining count
- [ ] Lighthouse mobile score > 85 (run `pnpm lighthouse`)
- [ ] No layout shift on game card load (CLS < 0.1)
- [ ] Works with JS disabled (SSR fallback for lobby)

### After Agent 4 (WS Server):
- [ ] Server starts and `/health` returns 200
- [ ] Can connect a Socket.io client to `/game` namespace
- [ ] Click processing pipeline: send click, timer resets in Redis
- [ ] Win detection: expire timer key manually, win event fires
- [ ] Multi-server: two instances share state via Redis pub/sub
- [ ] `fly deploy --dry-run` passes

### After Agent 5 (Game Engine):
- [ ] `pnpm test` in `packages/game-engine` — 100% pass
- [ ] `fraudScorer` returns values 0-1 for all input ranges
- [ ] `poolCalculator` math is correct (verify: 25% of gross = poolContribution)
- [ ] `GameTimer.sync()` snaps only when diff > 2 seconds
- [ ] Package importable in both Node.js and browser environments

### After Agent 6 (Ad System):
- [ ] Heartbeat validation rejects gaps > 10 seconds
- [ ] IP rate limiting blocks >20 views/hour
- [ ] Duplicate view check prevents double-crediting
- [ ] HMAC token verification rejects tampered tokens
- [ ] Fraud scoring job processes and updates ad_view.fraud_score
- [ ] Clickhouse receives events (check Clickhouse UI)

### After Agent 7 (Sponsor Dashboard):
- [ ] Campaign creation wizard: all 5 steps work
- [ ] Video upload to Cloudflare Stream succeeds
- [ ] Campaign activates after Stripe payment (test with Stripe test mode)
- [ ] Analytics dashboard shows data (may be seeded data)
- [ ] Budget cap enforced: campaign pauses when cap reached

### After Agent 8 (Payments):
- [ ] Stripe webhook handler processes `checkout.session.completed`
- [ ] Payout job is idempotent (run twice — second run is a no-op)
- [ ] Amounts > $500 are held for review
- [ ] Winners without Stripe account receive hold email
- [ ] User stats updated after payout

### After Agent 9 (Viral Growth):
- [ ] Referral link works: `qliqr.com/ref/[handle]` sets cookie and redirects
- [ ] Referral credited on first ad view completion
- [ ] Push notification sends (test with OneSignal sandbox)
- [ ] Winner announcement generates correct shareable URL
- [ ] OG image loads at `qliqr.com/api/og/win/[gameId]`
- [ ] Hall of Fame page loads and shows winners

### After Agent 10 (DevOps):
- [ ] GitHub Actions CI passes on a test PR
- [ ] `fly deploy` deploys WS server successfully
- [ ] `/health` endpoint returns correct data
- [ ] Sentry captures a test error
- [ ] All environment variables documented in `.env.example`

---

## 11. PHASE COMPLETION CRITERIA

### Phase 1 Complete (Agents 1+2 done):
- DB schema live in local Docker Postgres
- All UI components render correctly in isolation
- Types shared across packages without circular dependencies

### Phase 2 Complete (Agents 3+4+5 done):
- Full end-to-end flow works locally:
  1. Visit lobby → see game cards
  2. Click game → watch (simulated) ad
  3. Enter game → click button → timer resets
  4. Timer expires → win overlay shows
- WS server handles 100 concurrent test connections (run `node scripts/load-test-local.js`)

### Phase 3 Complete (Agents 6+7 done):
- Sponsor can create a campaign and fund it (Stripe test mode)
- Campaign auto-spawns a game room
- Ad fraud detection rejects test invalid sessions
- Clickhouse receiving events

### Phase 4 Complete (Agents 8+9 done):
- Winner receives payout (Stripe test mode)
- Referral system awards bonus clicks
- Push notifications deliver
- Winner share URL generates correct OG image

### Phase 5 Complete (Agent 10 done):
- CI/CD pipeline green on GitHub
- App deployed to Vercel (web) + Fly.io (ws-server)
- Production monitoring active
- Load test passes (p99 click latency < 200ms)

---

## 12. KNOWN TRICKY AREAS — READ BEFORE IMPLEMENTING

**Redis keyspace notifications for win detection:**
Upstash Redis REST API does NOT support keyspace notifications (subscribe). You need a second Redis instance for this: use Fly.io's managed Redis (`fly redis create`) which supports `notify-keyspace-events KEx`. The WS server connects to this via ioredis for the keyspace subscription only. All other Redis operations use Upstash REST.

**Socket.io across multiple Fly.io machines:**
Fly.io's anycast routing handles initial connection. But a user on Machine A won't receive broadcasts published to Machine B's in-memory rooms. Solution: use Socket.io Redis Adapter (`@socket.io/redis-adapter`). The adapter uses Redis pub/sub to bridge all machines. Configure this in `apps/ws-server/src/index.ts` before setting up namespaces.

**Cloudflare Stream — forward seek prevention:**
The Cloudflare Stream player embed doesn't natively block seeking. Implement this by: hiding the player's native controls (CSS), overlaying a custom control bar, and intercepting `currentTime` changes via the Stream Player API. If `currentTime` jumps forward > 2 seconds from the expected position, reset to the expected position.

**iOS Safari — autoplay restriction:**
Video cannot autoplay with sound on iOS. The video MUST start muted. Show an unmute button overlay. Tap-to-unmute is allowed by Safari's policy. Never try to call `.play()` without a user gesture.

**Stripe Connect Express onboarding:**
Winners must complete KYC via Stripe before receiving funds. The onboarding URL expires in 24 hours. Generate a fresh URL each time the user visits their profile. Store only `stripe_account_id` — never store card details.

**Optimistic UI + server reconciliation:**
When the player clicks, immediately: decrement local click count, show ripple animation, reset local timer to 30. Then wait for server `game:click` event. If server rejects (race condition, out of clicks), restore local state and show brief error toast. The user should perceive zero latency on the click action.

**QStash job deduplication:**
QStash delivers at-least-once. Every job handler MUST be idempotent. The payout job checks for existing payout records before executing. The click write job uses INSERT ... ON CONFLICT DO NOTHING.

---

## 13. FIRST COMMANDS TO RUN

Run these in order before spawning any agents:

```bash
# 1. Clone repo
git clone https://github.com/yourorg/qliqr && cd qliqr

# 2. Install pnpm
corepack enable && corepack prepare pnpm@latest --activate

# 3. Install dependencies
pnpm install

# 4. Start local infrastructure
docker-compose up -d

# 5. Verify Docker services
docker ps  # Should show postgres and redis running

# 6. Copy env template
cp .env.example apps/web/.env.local
cp .env.example apps/ws-server/.env
# Edit both files with your credentials

# 7. Initialize DB
pnpm db:migrate && pnpm db:seed

# 8. Verify setup
pnpm typecheck  # Should pass (empty project)
pnpm test       # Should pass (no tests yet)

# 9. Start build log
echo "# qliqr Build Log\n\nStarted: $(date)" > BUILD_LOG.md

# 10. Begin agent spawning (Section 4)
```

---

## 14. SUCCESS METRICS

The build is complete when:

1. A user can visit qliqr.com, watch a 30-second ad, enter a game, click the button, and have a real chance of winning a real cash prize
2. A sponsor can sign up, upload an ad, fund a budget, and see their game go live within 10 minutes
3. The platform handles 1,000 concurrent WebSocket connections without WS server CPU exceeding 30%
4. Click-to-broadcast latency p99 < 200ms (measured via k6 load test)
5. Lighthouse mobile score > 85 on the lobby and game pages
6. Zero TypeScript errors (`pnpm typecheck` exits 0)
7. All Vitest tests pass (`pnpm test` exits 0)
8. Deployed: Vercel (web + sponsor) + Fly.io (ws-server) + Supabase + Upstash

---

*CLAUDE.md — qliqr Platform v1.0 — Feed this file to `claude` at repo root in multi-agent mode.*
*All agents inherit this context. Orchestrator is responsible for BUILD_LOG.md.*