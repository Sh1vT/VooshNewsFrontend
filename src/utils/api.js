// src/utils/api.js
API_BASE_URL = import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/+$/, "") + "/api" : "/api"

/**
 * Helper that performs fetch and returns parsed JSON or throws a helpful error.
 */
async function request(path, opts = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  const text = await res.text();
  const payload = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const errMsg = payload?.error ?? payload ?? `${res.status} ${res.statusText}`;
    throw new Error(`Request ${path} failed: ${errMsg}`);
  }
  return payload;
}

export const api = {
  // create a server-side session id
  createSession: () => request("/session", { method: "POST" }),

  // Send a new query to the chatbot
  sendMessage: (sessionId, query) =>
    request(`/chat/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  // Get chat history for a session
  getChatHistory: (sessionId) => request(`/chat/${encodeURIComponent(sessionId)}`),

  // Clear chat history for a session
  clearChatHistory: (sessionId) => request(`/chat/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),

  // Health check
  checkHealth: () => request("/health"),

  // Featured article(s)
  // opts: { q: <string>, k: <number> }
  getFeatured: (opts = {}) => {
    const qp = [];
    if (opts.q) qp.push(`q=${encodeURIComponent(opts.q)}`);
    if (typeof opts.k !== "undefined") qp.push(`k=${encodeURIComponent(String(opts.k))}`);
    const suffix = qp.length ? `?${qp.join("&")}` : "";
    return request(`/featured${suffix}`);
  },
};
