// src/components/MessageList.jsx
import React, { useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

/**
 * Remove 'Source' markers (preserving newlines) before rendering,
 * so inline list markers aren't collapsed into a single line.
 */
const stripSourceLines = (text = "") => {
  if (!text) return "";
  try {
    let s = String(text);

    // 1) Convert "Source: https://..." (possibly wrapped in parens/brackets) -> keep the URL
    s = s.replace(/(?:\(|\[)?\s*Source\s*(?:[:\-—])\s*(https?:\/\/[^\s)\]]+)(?:\)|\])?/gi, "$1");

    // 2) Remove parenthetical/bracketed "Source: ..." fragments without URLs
    s = s.replace(/\(\s*Source\s*(?:[:\-—])\s*[^)\n]+\)/gi, "");
    s = s.replace(/\[\s*Source\s*(?:[:\-—])\s*[^\]\n]+\]/gi, "");

    // 3) Remove whole lines that are "Source: ..." (no URL). Replace with single newline so lists keep spacing.
    s = s.replace(/^[ \t]*Source\s*(?:[:\-—])\s*[^\n]*$/gim, "\n");

    // 4) Remove inline "Source: domain.com" label while keeping the domain text (useful if no protocol)
    s = s.replace(/Source\s*(?:[:\-—])\s*((?:[^\s)]+\.[^\s)]+))/gi, "$1");

    // 5) Reduce long runs of blank lines to 2
    s = s.replace(/\n{3,}/g, "\n\n");

    // Trim outer whitespace/newlines but preserve internal newlines
    return s.replace(/^[\s\n]+|[\s\n]+$/g, "");
  } catch (e) {
    return text;
  }
};

const MessageList = ({ messages = [], isTyping }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="message-list" role="log" aria-live="polite">
      {messages.length === 0 ? (
        <div style={{ padding: 8 }} />
      ) : (
        messages.map((m, idx) => {
          const key = m.id ?? `${m.type}-${idx}-${m.timestamp ?? idx}`;
          const cleanedText = stripSourceLines(m.text ?? "");

          if (m.type === "user") {
            return (
              <div key={key} className="message user" aria-label="Your message">
                <div className="message-content">
                  <div className="md">
                    <MarkdownRenderer text={cleanedText} showMeta={false} />
                  </div>
                  <div
                    className="message-timestamp"
                    style={{ marginTop: 8, fontSize: 12, color: "#9aa1a6", textAlign: "right" }}
                  >
                    {formatTime(m.timestamp)}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="message bot" aria-label="Assistant message">
              <div className="message-content">
                {/* showMeta true so article header and source pill are rendered */}
                <MarkdownRenderer text={cleanedText} showMeta={true} timestamp={m.timestamp} />
                <div className="message-timestamp" style={{ marginTop: 10, fontSize: 12, color: "#9aa1a6" }}>
                  {formatTime(m.timestamp)}
                </div>
              </div>
            </div>
          );
        })
      )}

      {isTyping && (
        <div className="message bot" aria-live="polite">
          <div className="message-content">
            <div className="typing-indicator" style={{ display: "inline-flex", gap: 6 }}>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
