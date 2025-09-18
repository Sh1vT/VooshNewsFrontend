// src/components/ChatApp.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { api } from "../utils/api";
import VooshLogo from "../assets/vooshrag_logo.png"; // ensure path is correct

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // controls the three-dot loader in MessageList
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [started, setStarted] = useState(false);

  // featured rotation state (kept as before)
  const [featuredItems, setFeaturedItems] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isRotatingPaused, setIsRotatingPaused] = useState(false);
  const rotateIntervalRef = useRef(null);

  // ---------------- lifecycle ----------------
  useEffect(() => {
    initializeSession();
    checkBackendHealth();
    fetchFeatured();
    return () => {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (sessionId) loadChatHistory(sessionId);
  }, [sessionId]);

  // rotate featured items every N ms (unless paused)
  useEffect(() => {
    const INTERVAL = 6000;
    if (!featuredItems || featuredItems.length <= 1) {
      if (rotateIntervalRef.current) {
        clearInterval(rotateIntervalRef.current);
        rotateIntervalRef.current = null;
      }
      return;
    }

    if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current);
    if (!isRotatingPaused) {
      rotateIntervalRef.current = setInterval(() => {
        setFeaturedIndex((i) => (i + 1) % featuredItems.length);
      }, INTERVAL);
    }

    return () => {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current);
      rotateIntervalRef.current = null;
    };
  }, [featuredItems, isRotatingPaused]);

  // ---------------- sessions / health ----------------
  const initializeSession = () => {
    let stored = localStorage.getItem("chatSessionId");
    if (!stored) {
      try {
        stored = crypto.randomUUID();
      } catch {
        stored = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      localStorage.setItem("chatSessionId", stored);
    }
    setSessionId(stored);
  };

  const checkBackendHealth = async () => {
    try {
      await api.checkHealth();
      setConnectionStatus("connected");
    } catch (err) {
      console.error("health check failed", err);
      setConnectionStatus("disconnected");
    }
  };

  const loadChatHistory = async (sid) => {
    try {
      const res = await api.getChatHistory(sid);
      let formatted = [];
      if (res?.history?.length) {
        res.history.forEach((h) => {
          const ts = h.timestamp ?? new Date().toISOString();
          if (h.query) formatted.push({ id: `u-${ts}`, type: "user", text: h.query, timestamp: ts });
          if (h.answer) formatted.push({ id: `b-${ts}`, type: "bot", text: h.answer, timestamp: ts });
        });
      } else if (Array.isArray(res) && res.length) {
        formatted = res.map((m, idx) => ({
          id: m.id ?? `${m.type ?? "m"}-${idx}`,
          type: m.type ?? "bot",
          text: m.text ?? m.answer ?? m.query ?? "",
          timestamp: m.timestamp ?? new Date().toISOString(),
        }));
      }
      if (formatted.length) {
        setMessages(formatted);
        setStarted(true);
      }
    } catch (err) {
      console.error("error loading history", err);
      setConnectionStatus("disconnected");
    }
  };

  // ---------------- featured fetching ----------------
  const fetchFeatured = useCallback(
    async (opts = { q: "geopolitical news", k: 3 }) => {
      try {
        const res = await api.getFeatured({ q: opts.q, k: opts.k });
        const arr = Array.isArray(res?.featured) ? res.featured : (res?.featured ? [res.featured] : []);
        if (arr.length > 0) {
          const normalized = arr
            .filter(Boolean)
            .map((f) => {
              const excerptRaw = String(f.excerpt ?? f.text ?? "").replace(/\n+/g, " ").trim();
              const excerpt = excerptRaw.length > 160 ? excerptRaw.slice(0, 157).trim() + "…" : excerptRaw;
              return {
                id: f.id ?? `${Math.random().toString(36).slice(2, 8)}`,
                headline: String(f.headline || f.title || "").trim(),
                excerpt,
                source: f.source || null,
                published: f.published || f.date || "",
                score: f.score ?? null,
              };
            })
            .slice(0, opts.k || 3);
          setFeaturedItems(normalized);
          setFeaturedIndex(0);
        } else if (res?.context) {
          const excerptRaw = String(res.context || "").replace(/\n+/g, " ").trim();
          const excerpt = excerptRaw.length > 160 ? excerptRaw.slice(0, 157).trim() + "…" : excerptRaw;
          setFeaturedItems([
            { id: "context-0", headline: "Top stories", excerpt, source: null, published: "" },
          ]);
        } else {
          setFeaturedItems([]);
        }
      } catch (err) {
        console.warn("fetchFeatured failed", err);
        setFeaturedItems([]);
      }
    },
    []
  );

  useEffect(() => {
    const REFRESH_MS = 5 * 60 * 1000;
    const id = setInterval(() => fetchFeatured({ q: "latest news", k: 3 }), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchFeatured]);

  // ---------------- chat send (simple dot loader UX) ----------------
  const simulateTypingEffect = (text, done) => {
    // keeps the small delay so the UI feels natural
    const delay = 300 + Math.min(1200, text.length * 4);
    setTimeout(() => done(text), delay);
  };

  const handleSendMessage = async (messageText) => {
    if (!sessionId || !messageText.trim()) return;
    if (!started) setStarted(true);

    const now = new Date().toISOString();
    const userMessage = {
      id: `u-${now}`,
      type: "user",
      text: messageText,
      timestamp: now,
    };

    // append user message
    setMessages((p) => [...p, userMessage]);

    // show dot loader immediately
    setIsTyping(true);
    setIsLoading(true);

    try {
      const res = await api.sendMessage(sessionId, messageText);
      const answer = (res && (res.answer ?? res.text ?? JSON.stringify(res))) || "No response.";

      // keep dots for a short moment then replace with real message
      simulateTypingEffect(answer, (botText) => {
        setIsTyping(false);
        const botMessage = {
          id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "bot",
          text: botText,
          timestamp: new Date().toISOString(),
        };
        setMessages((p) => [...p, botMessage]);
        setIsLoading(false);
      });
    } catch (err) {
      console.error("send error", err);
      setIsTyping(false);
      setIsLoading(false);
      const errMsg = {
        id: `err-${Date.now()}`,
        type: "bot",
        text: "Sorry — failed to reach the backend. Ensure the API is available (base: /api).",
        timestamp: new Date().toISOString(),
      };
      setMessages((p) => [...p, errMsg]);
    }
  };

  // ---------------- session reset ----------------
  const handleResetSession = async () => {
    if (!sessionId) return;
    try {
      await api.clearChatHistory(sessionId);
    } catch (err) {
      console.warn("clear chat failed", err);
    } finally {
      let newId;
      try {
        newId = crypto.randomUUID();
      } catch {
        newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      localStorage.setItem("chatSessionId", newId);
      setSessionId(newId);
      setMessages([]);
      setStarted(false);
      setConnectionStatus("connected");
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  // ---------------- focus helper ----------------
  const startAndFocus = () => {
    if (!started) setStarted(true);
    setTimeout(() => {
      const ta = document.querySelector(".message-textarea");
      if (ta && typeof ta.focus === "function") {
        ta.focus();
        const len = ta.value?.length ?? 0;
        try { ta.setSelectionRange(len, len); } catch {}
      }
    }, 120);
  };

  const getStatusText = () => {
    if (connectionStatus === "connected") return "Connected";
    if (connectionStatus === "disconnected") return "Disconnected";
    return "Connecting";
  };

  // ---------------- featured UI helpers ----------------
  const currentFeatured = featuredItems && featuredItems.length > 0 ? featuredItems[featuredIndex % featuredItems.length] : null;
  const onMouseEnterFeatured = () => setIsRotatingPaused(true);
  const onMouseLeaveFeatured = () => setIsRotatingPaused(false);
  const onTouchStartFeatured = () => setIsRotatingPaused(true);
  const onTouchEndFeatured = () => setIsRotatingPaused(false);

  // ---------------- render ----------------
  return (
    <div className={`chat-app ${started ? "started" : ""}`} role="application" aria-label="VooshNews">
      <div className="bg-grid" aria-hidden="true" />

      {/* NAVBAR */}
      <header className="top-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-left" style={{ alignItems: "flex-start" }}>
          <div className="logo-block" aria-hidden>
            <img src={VooshLogo} alt="VooshNews logo" className="logo-img" />
          </div>

          {/* Rotating NEWS COLUMN */}
          <div
            className="news-column"
            role="region"
            aria-label="Featured stories"
            onMouseEnter={onMouseEnterFeatured}
            onMouseLeave={onMouseLeaveFeatured}
            onTouchStart={onTouchStartFeatured}
            onTouchEnd={onTouchEndFeatured}
            style={{ minWidth: 260 }}
          >
            <div className="news-meta" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="news-source">{currentFeatured?.source ?? "VooshNews"}</span>
              <span className="news-dot" aria-hidden>•</span>
              <span className="news-time">{currentFeatured?.published ?? ""}</span>
            </div>

            <AnimatePresence mode="wait">
              {currentFeatured ? (
                <motion.div
                  key={currentFeatured.id || featuredIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  {currentFeatured.source ? (
                    <a
                      href={currentFeatured.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open story: ${currentFeatured.headline}`}
                      title={currentFeatured.headline}
                      className="news-link"
                      style={{ color: "inherit", textDecoration: "none", display: "block", cursor: "pointer" }}
                    >
                      <h3 className="news-headline" style={{ margin: "6px 0" }}>
                        {currentFeatured.headline || "Top stories"}
                      </h3>
                      <p className="news-excerpt" title={currentFeatured.excerpt || ""} style={{ margin: 0 }}>
                        {currentFeatured.excerpt || "Latest headlines appear here."}
                      </p>
                    </a>
                  ) : (
                    <div role="article" tabIndex={0} aria-label={currentFeatured.headline || "Top stories"} style={{ outline: "none" }}>
                      <h3 className="news-headline" style={{ margin: "6px 0" }}>
                        {currentFeatured.headline || "Top stories"}
                      </h3>
                      <p className="news-excerpt" title={currentFeatured.excerpt || ""} style={{ margin: 0 }}>
                        {currentFeatured.excerpt || "Latest headlines appear here."}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="no-featured" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="news-headline">Top stories</h3>
                  <p className="news-excerpt">Latest headlines appear here.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="nav-center" aria-hidden>
          {/* intentionally empty for now */}
        </div>

        <div className="nav-right">
          <div className="connection" role="status" aria-live="polite" aria-atomic="true">
            <span
              className={`status-dot ${connectionStatus === "connected" ? "online" : connectionStatus === "disconnected" ? "offline" : "connecting"}`}
              aria-hidden="true"
            />
            <span className="status-text">{getStatusText()}</span>
          </div>

          <button
            className="primary-button"
            onClick={handleResetSession}
            title="New session"
            aria-label="New session"
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden style={{ marginRight: 8 }}>
              <path d="M17.65 6.35A8 8 0 1 0 6.35 17.65" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Session
          </button>
        </div>
      </header>

      {/* STAGE / CHAT */}
      <div className="stage">
        {!started ? (
          <div className="hero">
            <div className="hero-inner">
              <div className="hello">Hello Reader</div>
              <div className="welcome">Welcome to VooshNews</div>
              <div className="source">Verified reporting · Documented sources · Clean, focused reading</div>

              <div
                className="hero-bubble"
                role="button"
                aria-label="Start chat"
                onClick={(e) => {
                  e.preventDefault();
                  startAndFocus();
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="bubble-text">
                  <span className="bullet" />
                  <span>Start a conversation — ask about any article or topic</span>
                </div>

                <div className="bubble-cta">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startAndFocus();
                    }}
                    aria-label="Start"
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-wrap">
            <MessageList messages={messages} isTyping={isTyping} />
          </div>
        )}
      </div>

      {/* pinned full-width input (hidden until started) */}
      <div className="message-input-container" aria-hidden={!started}>
        <div className="message-input-inner">
          <div className="input-wrapper">
            <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
