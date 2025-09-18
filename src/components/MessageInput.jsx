import React, { useState, useRef, useEffect } from "react";

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    // If the component mounts and the app already marked started, focus automatically.
    // Focus is orchestrated from ChatApp.startAndFocus(); this is just a safety net.
    const ta = ref.current;
    if (ta && typeof ta.focus === "function") {
      // no auto focus on mount by default
    }
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (!message.trim() || isLoading) return;
    onSendMessage(message.trim());
    setMessage("");
    setTimeout(() => ref.current?.focus?.(), 40);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  return (
    <form onSubmit={submit} className="message-input-form" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
      <div className="input-wrapper" style={{ flex: 1 }}>
        <textarea
          ref={ref}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onKeyDown}
          className="message-textarea"
          placeholder="Sports, Tech, Health, Business..."
          disabled={isLoading}
          rows={1}
          aria-label="Message"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={!message.trim() || isLoading}
        className="send-button"
        aria-label="Send"
      >
        {isLoading ? "..." : "Send"}
      </button>
    </form>
  );
};

export default MessageInput;
