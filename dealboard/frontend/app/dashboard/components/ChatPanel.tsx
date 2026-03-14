'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { api } from '@/lib/api';

const WELCOME: ChatMessageType = {
  id: 'welcome', role: 'ai',
  content: "Hello! I'm connected to your Google Workspace. Ask me anything about your emails, documents, or calendar.",
  timestamp: new Date(),
};

function Msg({ msg }: { msg: ChatMessageType }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
          ✦
        </div>
      )}
      <div className="max-w-[78%] flex flex-col gap-1.5">
        <div
          className="px-4 py-3 rounded-2xl text-[14px] leading-relaxed"
          style={isUser
            ? { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', borderRadius: '20px 20px 4px 20px' }
            : { background: 'white', color: '#0F172A', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '20px 20px 20px 4px' }
          }
        >
          {msg.content}
        </div>
        {msg.sources?.length ? (
          <div className={`flex gap-1.5 flex-wrap ${isUser ? 'justify-end' : ''}`}>
            {msg.sources.map((s, i) => (
              <span key={i} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{s}</span>
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
          <div className="mx-auto max-w-sm bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-[14px] font-medium text-amber-900 mb-3">Add your Gemini key to start chatting.</p>
            <button onClick={onNeedSettings} className="px-5 py-2 rounded-xl text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              Open Settings
            </button>
          </div>
        )}
        {messages.map(m => <Msg key={m.id} msg={m}/>)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center text-base flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>✦</div>
            <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex gap-1">
                <span className="dot" style={{ background: '#6366F1' }}/><span className="dot" style={{ background: '#8B5CF6' }}/><span className="dot" style={{ background: '#EC4899' }}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div className="bg-white border-t border-border px-6 py-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading}
            placeholder="Ask anything about your Gmail, Drive or Calendar…"
            rows={1}
            className="flex-1 resize-none text-[14px] text-ink leading-relaxed outline-none border border-border rounded-2xl px-4 py-3 bg-canvas placeholder:text-subtle transition-shadow"
            style={{ minHeight: 48, maxHeight: 120 }}
            onFocus={e => (e.target.style.borderColor = '#6366F1')}
            onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 text-lg"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 10px rgba(99,102,241,0.4)' }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
