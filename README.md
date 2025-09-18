# Voosh News — RAG Chatbot on News Articles

Live Demo: [voosh-news-frontend.vercel.app](https://voosh-news-frontend.vercel.app/)

A Vite + React + SCSS frontend for a Retrieval-Augmented Generation (RAG) chatbot. It connects to a Node.js/Express backend that handles ingestion, embeddings, retrieval, and Gemini-powered answers. Each browser session gets its own unique chat session.

| Mobile | Desktop |
|------------------|-------------------|
| ![Mobile Welcome](https://i.postimg.cc/Njj4jbGd/voosh-Rag-Welcome.jpg) | ![Desktop Welcome](https://i.postimg.cc/nLV6ZqNx/welcome.jpg) |
| ![Mobile Chat](https://i.postimg.cc/Nf4DtZty/Voosh-Rag-Working.jpg) | ![Desktop Chat](https://i.postimg.cc/pd03dptF/working.jpg) |

---

## Features
- Rotating **featured stories** ticker  
- Clean **chat interface** with typing indicator  
- **Session reset** (new UUID stored in `localStorage`)  
- **Markdown answers with citation pills** linking to sources  
- Connection status pill (Connecting / Connected / Disconnected)

---

## Architecture
1. Frontend sends query with `sessionId` → Backend  
2. Backend retrieves top-k passages from Qdrant  
3. Gemini synthesizes final answer with citations  
4. Redis stores session chat history (Default-TTL: 30 days)  
5. Answer is returned and rendered in the UI  

---

## Tech Stack
**Frontend:** React (Vite, SCSS, framer-motion, marked, dompurify)  
**Backend:** Node.js + Express  
**Vector DB:** Qdrant 
**LLM:** Gemini API  
**Embeddings:** Jina AI  
**Cache:** Redis Cloud

---

## API Endpoints
- `GET /health` → `{ status: "ok" }`  
- `GET /featured?q=...&k=...` → Featured stories  
- `GET /chat/:sessionId` → Chat history  
- `POST /chat/:sessionId` with `{ query }` → `{ answer }`  
- `DELETE /chat/:sessionId` → Clears session  

---

## Getting Started
### Prerequisites
- Node.js 18+  
- npm / yarn / pnpm  

### Setup
```bash
# Install deps
npm install

# Run dev server (http://localhost:5173)
npm run dev
```
Ensure your backend is running locally and accessible under /api (or configure proxy in vite.config.ts).

### Project Structure
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

---

### Troubleshooting
- 404 API errors → check VITE_API_BASE or dev proxy
- CORS issues → prefer same-origin /api in production
- Missing featured stories → UI still works without them
