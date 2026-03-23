import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import axiosClient from "../utils/axiosClient";
import { Send, Bot, User } from "lucide-react";

export default function ChatAi({ problem }) {
  const [messages, setMessages] = useState([
    { role: "model", parts: [{ text: "Hi! I'm your DSA tutor. Ask me for hints, code reviews, or to walk you through the solution." }] },
  ]);
  const [thinking, setThinking] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const onSubmit = async (data) => {
    const userMsg = { role: "user", parts: [{ text: data.message }] };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    reset();
    setThinking(true);
    try {
      const { data: res } = await axiosClient.post("/ai/chat", {
        messages: updatedMessages,
        title: problem.title,
        description: problem.description,
        testCases: problem.visibleTestCases,
        startCode: problem.startCode,
      });
      setMessages((prev) => [...prev, { role: "model", parts: [{ text: res.message }] }]);
    } catch {
      setMessages((prev) => [...prev, { role: "model", parts: [{ text: "Sorry, I encountered an error. Please try again." }] }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      <style>{`
        .chat-messages { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:14px; padding-bottom:12px; }
        .chat-msg { display:flex; gap:10px; align-items:flex-start; }
        .chat-msg.user { flex-direction:row-reverse; }
        .chat-avatar { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
        .chat-avatar.bot { background:rgba(255,161,22,0.15); border:1px solid rgba(255,161,22,0.2); color:#ffa116; }
        .chat-avatar.user-av { background:rgba(255,255,255,0.06); border:1px solid #222; color:#888; }
        .chat-bubble { max-width:85%; padding:10px 14px; border-radius:12px; font-size:13px; line-height:1.7; font-family:'JetBrains Mono',monospace; white-space:pre-wrap; word-break:break-word; }
        .chat-bubble.bot { background:#161616; border:1px solid #1e1e1e; color:#bbb; border-radius:4px 12px 12px 12px; }
        .chat-bubble.user { background:rgba(255,161,22,0.1); border:1px solid rgba(255,161,22,0.2); color:#e0e0e0; border-radius:12px 4px 12px 12px; }
        .chat-thinking { display:flex; gap:4px; align-items:center; padding:10px 14px; }
        .chat-dot { width:6px; height:6px; background:#444; border-radius:50%; animation:chat-bounce 1.2s ease-in-out infinite; }
        .chat-dot:nth-child(2) { animation-delay:0.2s; }
        .chat-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes chat-bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); background:#ffa116; } }
        .chat-form { display:flex; gap:8px; padding-top:12px; border-top:1px solid #1a1a1a; margin-top:auto; }
        .chat-input { flex:1; background:#111; border:1px solid #1e1e1e; border-radius:9px; padding:10px 14px; font-size:13px; color:#e0e0e0; outline:none; font-family:'JetBrains Mono',monospace; transition:border-color 0.2s; }
        .chat-input:focus { border-color:#ffa116; }
        .chat-send { background:#ffa116; border:none; border-radius:9px; width:38px; height:38px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#000; transition:opacity 0.2s; flex-shrink:0; }
        .chat-send:hover:not(:disabled) { opacity:0.85; }
        .chat-send:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role === "user" ? "user" : ""}`}>
            <div className={`chat-avatar ${msg.role === "user" ? "user-av" : "bot"}`}>
              {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div className={`chat-bubble ${msg.role === "user" ? "user" : "bot"}`}>
              {msg.parts[0].text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="chat-msg">
            <div className="chat-avatar bot"><Bot size={13} /></div>
            <div className="chat-bubble bot">
              <div className="chat-thinking">
                <div className="chat-dot" /><div className="chat-dot" /><div className="chat-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="chat-form">
        <input
          placeholder="Ask for hints, code review, or optimal solution..."
          className="chat-input"
          {...register("message", { required: true, minLength: 2 })}
        />
        <button type="submit" className="chat-send" disabled={thinking || !!errors.message}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
