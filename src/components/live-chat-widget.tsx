"use client";

import { useState } from "react";

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{text: string; sender: 'bot' | 'user'}[]>([
    { text: "Hello! How can we assist you today with the Ghana Prisons Learning Portal?", sender: "bot" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, { text: input, sender: 'user' }]);
    setInput("");
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "Thanks for reaching out. An agent will be with you shortly.", sender: 'bot' }]);
    }, 1000);
  };

  return (
    <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
      {isOpen && (
        <div style={{ width: '340px', background: '#fff', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', border: '1px solid #eaeaea', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(135deg, #c88c5a, #8a5934)', color: '#fff', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Live Support</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>We typically reply in a few minutes.</p>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
          </div>
          
          <div style={{ padding: '20px', height: '300px', overflowY: 'auto', background: '#fdfaf6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                background: msg.sender === 'bot' ? '#f0ece6' : '#c88c5a', 
                color: msg.sender === 'bot' ? '#333' : '#fff',
                padding: '12px 16px', 
                borderRadius: msg.sender === 'bot' ? '12px 12px 12px 0' : '12px 12px 0 12px', 
                alignSelf: msg.sender === 'bot' ? 'flex-start' : 'flex-end', 
                maxWidth: '85%', 
                fontSize: '0.9rem',
                lineHeight: 1.4
              }}>
                {msg.text}
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSend} style={{ padding: '12px', borderTop: '1px solid #eaeaea', display: 'flex', gap: '8px', background: '#fff' }}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #dcc8b6', outline: 'none', fontSize: '0.9rem' }} 
            />
            <button 
              type="submit"
              style={{ background: 'var(--copper-500)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#fff', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', fontSize: '1rem', fontWeight: 700, color: '#333', border: '1px solid #eaeaea', position: 'relative' }}>
            How can we help?
            <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', width: '0', height: '0', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '10px solid #fff' }}></div>
          </div>
          <button 
            type="button" 
            className="floating-chat-btn"
            onClick={() => setIsOpen(true)}
            style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #c88c5a, #8a5934)', 
              color: '#fff', 
              boxShadow: '0 12px 32px rgba(139, 84, 46, 0.45)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.4rem', 
              border: 'none', 
              cursor: 'pointer',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            aria-label="Open Live Chat"
          >
            💬
          </button>
        </div>
      )}
    </div>
  );
}
