// src/components/MarkdownRenderer.jsx
import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Replace inline links and Source: tokens with citation markers [1], [2], ...
 * Keep a list of unique links (in order) and render them as pills at the bottom.
 *
 * Notes:
 * - Preserves list/newline formatting so bullets don't collapse.
 * - For markdown links [text](url) => becomes: text [n]
 * - For plain URLs => [n]
 * - For "Source: url" variants => [n]
 */

function collectAndReplaceLinks(raw) {
  let s = String(raw || "");

  const linkOrder = [];
  const indexFor = (url) => {
    // clean URL (remove trailing punctuation that breaks links)
    const cleaned = url.replace(/[.,;:!?)}\]]+$/g, "");
    const found = linkOrder.indexOf(cleaned);
    if (found >= 0) return found + 1;
    linkOrder.push(cleaned);
    return linkOrder.length;
  };

  // Markdown links: [label](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (match, label, url) => {
    const n = indexFor(url);
    return `${label} [${n}]`;
  });

  // Source: <url>
  s = s.replace(/(?:\(|\[)?\s*Source\s*(?:[:\-—])\s*(https?:\/\/[^\s)\]]+)(?:\)|\])?/gi, (match, url) => {
    const n = indexFor(url);
    return `[${n}]`;
  });

  // Parenthetical/bracketed Source (without URL)
  s = s.replace(/\(\s*Source\s*(?:[:\-—])\s*[^)\n]+\)/gi, "");
  s = s.replace(/\[\s*Source\s*(?:[:\-—])\s*[^\]\n]+\]/gi, "");

  // Plain URLs
  s = s.replace(/https?:\/\/[^\s)]+/gi, (url) => {
    const n = indexFor(url);
    return `[${n}]`;
  });

  // Domain-only "Source: domain.com"
  s = s.replace(/(?:\(|\[)?\s*Source\s*(?:[:\-—])\s*([a-z0-9.\-]+\.[a-z]{2,})(?:\)|\])?/gi, (match, domain) => {
    const url = `https://${domain}`;
    const n = indexFor(url);
    return `[${n}]`;
  });

  // Cleanup
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/^[\s\n]+|[\s\n]+$/g, "");

  return { text: s, links: linkOrder };
}


marked.setOptions({ breaks: true, gfm: true });

export default function MarkdownRenderer({ text = "", showMeta = true, timestamp = null }) {
  const cleanedInput = String(text || "");

  // collect links and produce replaced text with citation markers
  const { replacedText, links } = useMemo(() => {
    const { text: replaced, links: linkOrder } = collectAndReplaceLinks(cleanedInput);
    return { replacedText: replaced, links: linkOrder };
  }, [cleanedInput]);

  // Title extraction (first H1/H2) — run against original replacedText
  const { title, remaining } = useMemo(() => {
    const raw = replacedText || "";
    const match = raw.match(/^(?:\s)*(?:#{1,2})\s+([^\n]+)/m);
    if (match) {
      return { title: match[1].trim(), remaining: raw.replace(match[0], "").trim() };
    }
    return { title: null, remaining: raw };
  }, [replacedText]);

  const htmlBody = useMemo(() => {
    const toParse = remaining || replacedText || "";
    const raw = marked.parse(String(toParse));
    return DOMPurify.sanitize(raw);
  }, [remaining, replacedText]);

  const prettyTs = useMemo(() => {
    if (!timestamp) return "";
    try {
      const dt = new Date(timestamp);
      return dt.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [timestamp]);

  const domainFromUrl = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u;
    }
  };

  return (
    <div className="md">
      {showMeta && title ? (
        <div className="article-header" aria-hidden>
          <div>
            <div className="article-title">{title}</div>
            {prettyTs ? <div style={{ color: "#9aa1a6", fontSize: 12 }}>{prettyTs}</div> : null}
          </div>

          <div className="article-meta" aria-hidden>
            {links.length > 0 ? (
              <div className="source-pill" title={links[0]}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M10 14a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2h-4z" fill="#cbd5e1" />
                  <path d="M15 7h2a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-2" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 17H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h2" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 12 }}>{domainFromUrl(links[0])}</span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#9aa1a6" }}>VooshNews</div>
            )}
          </div>
        </div>
      ) : null}

      <div dangerouslySetInnerHTML={{ __html: htmlBody }} />

      {links.length > 0 ? (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {links.map((l, i) => (
            <a
              key={i}
              href={l}
              rel="noopener noreferrer"
              target="_blank"
              style={{
                fontSize: 12,
                color: "var(--accent-red)",
                background: "rgba(255,255,255,0.02)",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.02)",
                textDecoration: "none",
              }}
            >
              {`[${i + 1}] ${domainFromUrl(l)}`}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
