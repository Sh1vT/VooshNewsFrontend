# Voosh News — RAG Chatbot on News Articles

This project is live at [Vercel](https://voosh-news-frontend.vercel.app/)

A Vite + React + SCSS frontend for a Retrieval-Augmented Generation (RAG) chatbot for news websites. It connects to a Node.js/Express backend that performs ingestion, embeddings, retrieval and calls Gemini for answers. Each browser session is a unique chat session.

## Table of Contents
- Overview
- Demo: What You Will See
- Architecture (End-to-End)
- Tech Stack & Justification
- Frontend Details (This Repo)
- Backend API Contract
- Getting Started
- Project Structure
- Development Notes
- Caching & Performance (How to configure TTLs)
- Troubleshooting
- Deliverables Checklist (as per assignment)

## Overview
This is the frontend part of the assignment “Build a RAG-Powered Chatbot for News Websites.” It provides a clean chat interface that:
- Shows a rotating “featured stories” ticker
- Lets a user ask questions about the news corpus
- Streams-like feedback via a typing indicator and then renders the assistant reply
- Allows resetting the session (new session id)
- Renders assistant markdown with citation pills derived from links

The backend is expected to expose REST endpoints for health, featured stories, chat send, history, and clear operations. Session state is identified on the frontend by a UUID stored in `localStorage` and used per request.

## Demo: What You Will See
- A top navbar with logo, a “featured stories” section, and a connection status pill
- A hero section with a “Start” bubble that brings focus to the chat input
- A chat area that shows past messages and a typing indicator while waiting
- A pinned input at the bottom with Enter-to-send behavior
- A Reset button in the navbar to start a brand-new session

## Architecture (End-to-End)
- Ingestion (~200 articles): RSS/sitemaps or scrape → normalized documents
- Embeddings: Jina Embeddings → vectors
- Vector DB: Qdrant with metadata
- Query flow:
  1) Frontend sends user query with `sessionId` to backend
  2) Backend retrieves top-k passages via vector DB
  3) Backend calls Gemini to synthesize final answer (with references)
  4) Backend returns answer to frontend
- Sessions & Cache:
  - Session chat history in Redis (TTL-configured)

## Tech Stack & Justification
- Frontend: React + Vite + SCSS
  - Fast dev server and build; simple and flexible styling
- Animations: `framer-motion`
- Markdown & Sanitization: `marked` + `dompurify`
- State: Local React state (simple chat UI)
- Backend: Node.js + Express
- Vector DB: Qdrant
- LLM: Gemini API (Google AI Studio)
- Cache: Redis for session history and quick lookups

## Frontend Details (This Repo)
Key components in `src/`:
- `components/ChatApp.jsx`: Main screen, session management, featured stories rotation, send/reset actions, health check
- `components/MessageList.jsx`: Renders messages; shows typing indicator; auto-scrolls
- `components/MessageInput.jsx`: Textarea with Enter-to-send and disabled during requests
- `components/MarkdownRenderer.jsx`: Converts markdown to safe HTML, extracts links, shows citation pills `[1], [2]`
- `utils/api.js`: API client with a resilient base URL resolution
- `styles.scss`: Full-screen dark UI, navbar, hero, bubbles, input, animations
- `App.tsx`, `main.tsx`: App bootstrap (Vite + React)

Notable UI features:
- Rotating “featured items” every few seconds, with pause on hover/touch
- Connection status pill: Connecting/Connected/Disconnected based on `/health`
- Reset session button creates a new UUID and clears local messages
- Citation pills: Open the source links on a new tab

## Backend API Contract
The frontend uses these REST endpoints:
- `GET /health` → `{ status: "ok" }` or any 2xx
- `GET /featured?q=...&k=...` → `{ featured: [ { id, headline, excerpt, source, published, score? } ] }`
- `GET /chat/:sessionId` → Returns chat history.
- `POST /chat/:sessionId` with `{ query: string }` → `{ answer: string }` (may include markdown and links)
- `DELETE /chat/:sessionId` → 204, clears history in backend and Redis

Notes:
- Session id is a UUID stored in `localStorage` under `chatSessionId` and sent with every chat request
- Featured items are optional but the UI supports them
- Errors should respond with `{ error: string }` and appropriate HTTP codes

## Getting Started
Prerequisites:
- Node.js 18+
- npm (or yarn/pnpm)

Install and run:
```bash
# install deps
npm install

# run dev (Vite default: http://localhost:5173)
npm run dev
```

Make sure your backend runs locally and is reachable at one of:
- same origin under `/api` (recommended for production)
- or edit `/vite.config.ts` to have your `target` backend url in `/api` proxy 

## Project Structure
```
src/
  assets/
  components/
    ChatApp.jsx
    MessageInput.jsx
    MessageList.jsx
    MarkdownRenderer.jsx
  utils/
    api.js
  App.tsx
  main.tsx
  styles.scss
```

## Development Notes
- Enter sends a message; Shift+Enter inserts newline
- The input disables while a request is in-flight
- Typing indicator displays until the reply is rendered
- `MarkdownRenderer` extracts links and renders citation pills `[1] [2]` with domains
- Featured stories are fetched and rotated every few seconds; hover pauses rotation
- Reset button clears backend history then rolls a new `sessionId`

## Caching & Performance (How to configure TTLs)
Backend guidance (document in backend README too):
- Redis keys: `session:{sessionId}` storing an array of `{ query, answer, timestamp }`
- Suggested TTL per session: 24 hours (e.g., `EXPIRE session:{id} 86400` on write)
- Cache featured stories for 1–5 minutes to reduce upstream calls
- Warm caches on startup: pre-fetch featured queries like `latest news`, `top stories` and set Redis with short TTLs
- Use request-level timeouts and retries for vector DB and LLM calls

Frontend-specific:
- Keep messages in memory for the current tab; re-hydrate from `/chat/:sessionId` on reload
- Avoid over-polling featured; fetch on load and refresh on an interval (already implemented)

## Troubleshooting
- Blank page or errors: open DevTools console and Network tab
- 404 on API calls: check `VITE_API_BASE` or your dev proxy
- CORS errors: prefer same-origin `/api` in production, or configure CORS on backend
- No featured stories: ensure `/featured` is implemented; UI works without it
- History missing: verify `/chat/:sessionId` GET returns one of the supported formats

## Deliverables Checklist (as per assignment)
- Tech stack list included (see Tech Stack & Justification)
- Two repos: frontend (this) and backend (Node/Express)
- Demo video: show starting frontend, asking queries, receiving Gemini answers, viewing and resetting chat history
- Code walkthrough: explain ingestion → embeddings → vector DB → retrieval → Gemini → response; Redis session history; API calls from frontend
- Live deployment: public URL to test chatbot

