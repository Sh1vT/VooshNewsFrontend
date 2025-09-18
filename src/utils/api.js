// src/utils/api.js
// Robust API base resolution: prefers VITE_API_BASE when provided (prod or custom).
// Otherwise:
//   - in local dev (localhost / 127.0.0.1) -> use '/api' so Vite dev-server proxy handles it
//   - in production served from same origin -> use window.location.origin + '/api'
// This minimizes configuration changes between dev and prod.
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "";

function normalizeBase(raw) {
  if (!raw) return "";
  return String(raw).replace(/\/+$/, "");
}

const cleaned = normalizeBase(RAW_BASE);

// runtime detection: browser-only code uses window
let API_BASE_URL;
if (cleaned) {
  // explicit override (useful in CI / build time for cross-origin production backends)
  API_BASE_URL = cleaned;
} else if (typeof window !== "undefined" && window?.location) {
  const hostname = window.location.hostname;
  // treat localhost and 127.* as dev -> use vite proxy prefix
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "") {
    API_BASE_URL = "/api";
  } else {
    // production: assume the backend is same origin and mounted under /api
    // this avoids needing an env var when frontend + backend are served together
    API_BASE_URL = `${window.location.origin}/api`;
  }
} else {
  // fallback for SSR or non-browser contexts
  API_BASE_URL = "/api";
}

console.log(`[API] API_BASE_URL resolved to: ${API_BASE_URL} (VITE_API_BASE=${RAW_BASE})`);

/**
 * Helper that performs fetch and returns parsed JSON or throws a helpful error.
 * Accepts absolute or relative `path` (if path already starts with http(s) it will be used directly).
 */
async function request(path, opts = {}) {
  // allow callers to pass a full URL as path
  let url;
  if (/^https?:\/\//i.test(path)) {
    url = path;
  } else {
    // ensure path begins with '/'
    const p = path.startsWith("/") ? path : `/${path}`;
    // allow API_BASE_URL to be either absolute or relative
    url = `${API_BASE_URL.replace(/\/+$/, "")}${p}`;
  }

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  const text = await res.text();
  const payload = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!res.ok) {
    const errMsg = payload?.error ?? payload ?? `${res.status} ${res.statusText}`;
    throw new Error(`Request ${path} failed: ${errMsg}`);
  }
  return payload;
}

export const api = {
  createSession: () => request("/session", { method: "POST" }),
  sendMessage: (sessionId, query) =>
    request(`/chat/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  getChatHistory: (sessionId) => request(`/chat/${encodeURIComponent(sessionId)}`),
  clearChatHistory: (sessionId) => request(`/chat/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  checkHealth: () => request("/health"),
  getFeatured: (opts = {}) => {
    const qp = [];
    if (opts.q) qp.push(`q=${encodeURIComponent(opts.q)}`);
    if (typeof opts.k !== "undefined") qp.push(`k=${encodeURIComponent(String(opts.k))}`);
    const suffix = qp.length ? `?${qp.join("&")}` : "";
    return request(`/featured${suffix}`);
  },
};
