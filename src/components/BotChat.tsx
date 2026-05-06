"use client";

import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "מה יש בחודש מרץ?",
  "תמליץ על קמפוס לנגרות",
  "אילו אירועים יש לכיתות ז'?",
  "איזה חודש הכי עמוס?",
];

export default function BotChat() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>([
    { role: "assistant", content: "שלום! אני הבוט של פורטל אופקים 👋\nאפשר לשאול אותי על אירועים, קמפוסים, או לקבל המלצות תזמון." },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, open]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const newHistory: Message[] = [...history, { role: "user", content: msg }];
    setHistory(newHistory);
    setLoading(true);
    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: newHistory.slice(1) }),
      });
      const { reply } = await res.json();
      setHistory(h => [...h, { role: "assistant", content: reply }]);
    } catch {
      setHistory(h => [...h, { role: "assistant", content: "אופס, הייתה שגיאה. נסה שוב." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* כפתור פלואוטינג */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, left: 24, zIndex: 200,
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--bot-primary)", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 22,
          boxShadow: "0 4px 20px rgba(127,119,221,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "✕" : "✨"}
      </button>

      {/* חלון הצ'אט */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, left: 24, zIndex: 200,
          width: 340, maxHeight: 500,
          background: "#fff", borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid var(--bot-light)",
        }}>

          {/* כותרת */}
          <div style={{
            background: "linear-gradient(135deg, var(--bot-primary) 0%, var(--bot-dark) 100%)",
            padding: "12px 16px", color: "#fff",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>✨</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>בוט אופקים</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>מופעל ע"י Claude AI</div>
            </div>
          </div>

          {/* הודעות */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((msg, i) => (
              <div key={i} style={{
                maxWidth: "85%",
                alignSelf: msg.role === "user" ? "flex-start" : "flex-end",
              }}>
                <div style={{
                  padding: "8px 12px", borderRadius: msg.role === "user"
                    ? "var(--radius-md) var(--radius-md) var(--radius-md) 4px"
                    : "var(--radius-md) var(--radius-md) 4px var(--radius-md)",
                  background: msg.role === "user" ? "var(--bg-secondary)" : "var(--bot-lighter)",
                  fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-end", padding: "8px 12px", background: "var(--bot-lighter)", borderRadius: "var(--radius-md)", fontSize: 18 }}>
                <span style={{ animation: "pulse 1s infinite" }}>●</span>
                <span style={{ animation: "pulse 1s 0.3s infinite", margin: "0 2px" }}>●</span>
                <span style={{ animation: "pulse 1s 0.6s infinite" }}>●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* הצעות מהירות */}
          {history.length <= 1 && (
            <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 12,
                  border: "1px solid var(--bot-light)", background: "var(--bot-lighter)",
                  color: "var(--bot-dark)", cursor: "pointer",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* שדה קלט */}
          <div style={{
            padding: "10px 12px", borderTop: "0.5px solid var(--border)",
            display: "flex", gap: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="שאל אותי משהו..."
              style={{
                flex: 1, padding: "8px 12px", fontSize: 13,
                border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                fontFamily: "inherit", outline: "none",
              }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading} style={{
              width: 36, height: 36, borderRadius: "var(--radius-md)",
              background: input.trim() ? "var(--bot-primary)" : "var(--bg-secondary)",
              color: input.trim() ? "#fff" : "var(--text-tertiary)",
              border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>→</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:0.3 } 50% { opacity:1 } }
      `}</style>
    </>
  );
}
