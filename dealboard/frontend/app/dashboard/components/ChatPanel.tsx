'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { api } from '@/lib/api';

const WELCOME: ChatMessageType = {
  id: 'welcome', role: 'ai',
  content: "Hello! I'm connected to your Google Workspace. Ask me anything about your emails, documents, or calendar.",
  timestamp: new Date(),
};

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  );
}

function Msg({ msg }: { msg: ChatMessageType }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div
          className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 text-base grad-text"
          style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.25)', fontSize: 16 }}
        >
          ✦
        </div>
      )}
      <div className="max-w-[78%] flex flex-col gap-1.5">
        <div
          className="px-4 py-3 text-[14px] leading-relaxed"
          style={isUser
            ? {
                background: 'linear-gradient(135deg, rgba(66,133,244,0.25), rgba(147,52,230,0.25))',
                border: '1px solid rgba(66,133,244,0.3)',
                color: '#E8EAED',
                borderRadius: '20px 20px 4px 20px',
              }
            : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E8EAED',
                borderRadius: '20px 20px 20px 4px',
              }
          }
        >
          {msg.content}
        </div>
        {msg.sources?.length ? (
          <div className={`flex gap-1.5 flex-wrap ${isUser ? 'justify-end' : ''}`}>
            {msg.sources.map((s, i) => (
              <span
                key={i}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                style={{ background: 'rgba(66,133,244,0.12)', color: '#8AB4F8', border: '1px solid rgba(66,133,244,0.2)' }}
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ChatPanel({ geminiConnected, onNeedSettings }: { geminiConnected: boolean; onNeedSettings: () => void }) {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!geminiConnected) { onNeedSettings(); return; }
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: new Date() }]);
    setInput(''); setLoading(true);
    try {
      const res = await api.sendMessage(text);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'ai', content: res.success ? res.data.answer : (res.error || 'Error'), sources: res.success ? res.data.sources : [], timestamp: new Date() }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'ai', content: e.message || 'Something went wrong.', timestamp: new Date() }]);
    } finally { setLoading(false); }
  }, [input, loading, geminiConnected, onNeedSettings]);

  return (
    <div className="flex flex-col h-full bg-canvas">
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {!geminiConnected && (
          <div
            className="mx-auto max-w-sm rounded-2xl p-5 text-center"
            style={{ background: 'rgba(251,188,5,0.08)', border: '1px solid rgba(251,188,5,0.2)' }}
          >
            <p className="text-[14px] font-medium mb-3" style={{ color: '#FDD663' }}>Add your Gemini key to start chatting.</p>
            <button
              onClick={onNeedSettings}
              className="px-5 py-2 rounded-xl text-[13px] font-bold text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)' }}
            >
              Open Settings
            </button>
          </div>
        )}
        {messages.map(m => <Msg key={m.id} msg={m}/>)}
        {loading && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-2xl flex items-center justify-center text-base flex-shrink-0 grad-text"
              style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.25)' }}
            >✦</div>
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex gap-1">
                <span className="dot" style={{ background: '#4285F4' }}/>
                <span className="dot" style={{ background: '#9334E6' }}/>
                <span className="dot" style={{ background: '#E8437B' }}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div
        className="px-6 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0D0D11' }}
      >
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading}
            placeholder="Ask anything about your Gmail, Drive or Calendar…"
            rows={1}
            className="flex-1 resize-none text-[14px] text-ink leading-relaxed outline-none rounded-2xl px-4 py-3 transition-all"
            style={{
              minHeight: 48,
              maxHeight: 120,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#E8EAED',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(66,133,244,0.5)';
              e.target.style.boxShadow = '0 0 0 3px rgba(66,133,244,0.12)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.10)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)', boxShadow: '0 2px 10px rgba(66,133,244,0.3)' }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
