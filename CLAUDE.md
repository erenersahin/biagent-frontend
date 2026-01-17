# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BiAgent is an AI-powered JIRA ticket resolution system. This is the **frontend** directory - a React/TypeScript SPA that displays real-time token streaming from an 8-step agent pipeline.

## Commands

```bash
npm run dev       # Start dev server (port 3000, proxies to backend on 8888)
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint with zero warnings allowed
```

## Architecture

### Data Flow

```
React Components → Zustand Store → API Layer (lib/api.ts) + WebSocket (hooks/useWebSocket.ts) → FastAPI Backend (port 8888)
```

### Key Files

- **`src/lib/store.ts`** - Zustand state management (session, tickets, pipeline, streaming events)
- **`src/lib/api.ts`** - Typed HTTP API client for all backend endpoints
- **`src/hooks/useWebSocket.ts`** - WebSocket connection with auto-reconnect, heartbeat, visibility handling
- **`src/types/index.ts`** - TypeScript interfaces for all data models

### Pages

- **Dashboard** (`/`) - Ticket list with filtering (assignee, status, epic) and stats
- **TicketDetail** (`/ticket/:ticketKey`) - Pipeline execution view with streaming step output

### State Management Patterns

```typescript
// Selector pattern (prevents unnecessary re-renders)
const field = useStore((state) => state.field)

// Destructuring actions
const { fetchTickets, handleWSMessage } = useStore()
```

- Step events stored chronologically, consecutive text tokens merged for efficiency
- Step outputs preserved separately after completion
- Session persisted to localStorage with tab tracking

### WebSocket Message Types

Pipeline events: `pipeline_started`, `pipeline_completed`, `pipeline_failed`, `pipeline_paused`
Step events: `step_started`, `step_completed`, `token`, `tool_call_started`
System events: `sync_complete`, `ticket_updated`

## Configuration

**Environment** (`.env`):
```
VITE_API_URL=http://localhost:8888
VITE_WS_URL=ws://localhost:8888
```

**Vite** proxies `/api` and `/ws` to backend URLs in development.

## Design System

- **Primary**: `#F0FB29` (neon yellow) + `#202020` (dark)
- **Fonts**: IBM Plex Sans/Mono
- Custom Tailwind animations: pulse, token fade-in, blink, slideDown
- Status colors defined in `tailwind.config.js` safelist for dynamic class usage
