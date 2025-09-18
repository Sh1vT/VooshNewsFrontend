// src/components/MessageInput.jsx
import React, { useState, useRef, useEffect } from "react";

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    // safety autosize on mount
    autosize();
    // eslint-disable-next-line
  }, []);

  const autosize = () => {
    const ta = ref.current;
    if (!ta) return;
    // reset to auto to recalc properly
    ta.style.height = "auto";
    // clamp max-height if desired (optional) -> we'll allow CSS max-height to control vertical limit
    ta.style.height = `${Math.min(ta.scrollHeight, 400)}px`; // 400px cap
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!message.trim() || isLoading) return;
    onSendMessage(message.trim());
    setMessage("");
    // reset height after sending
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.height = "auto";
        ref.current.focus();
      }
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  const onChange = (e) => {
    setMessage(e.target.value);
    autosize();
  };

  const onPaste = (e) => {
    // small delay so pasted content is present to measure
    requestAnimationFrame(autosize);
  };

  return (
    <form
      onSubmit={submit}
      className="message-input-form"
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12 }}
    >
      <div className="input-wrapper" style={{ flex: 1 }}>
        <textarea
          ref={ref}
          value={message}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
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
