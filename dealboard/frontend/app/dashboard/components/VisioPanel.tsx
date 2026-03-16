'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Insights } from '@/lib/types';
import { api } from '@/lib/api';

interface Bubble {
  id: string;
  type: 'doc' | 'info' | 'action';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  content: string;
  timestamp: string;
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
}

export default function VisioPanel() {
  const [meetingActive, setMeetingActive] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [liveSpeech, setLiveSpeech] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const recognitionRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getInsights();
      if (res.success) setInsights(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBubble = (bubble: Omit<Bubble, 'id' | 'timestamp'>) => {
    const newBubble: Bubble = {
      ...bubble,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setBubbles(prev => [newBubble, ...prev]);
  };

  const initSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setLiveSpeech(finalTranscript || interimTranscript);

      if (finalTranscript) {
        const text = finalTranscript.toLowerCase();
        const keywords = ['projet', 'contrat', 'roadmap', 'réunion', 'budget', 'client', 'mail', 'document', 'stratégie'];
        if (keywords.some(k => text.includes(k))) {
          processContext(text);
        }
      }
    };

    recognition.onend = () => { if (isListening) recognition.start(); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const processContext = async (text: string) => {
    setIsTyping(true);
    try {
      const res = await api.sendMessage(`Live context: "${text}". Search for files/emails and summarize in ONE punchy sentence.`);

      if (res.success && res.data.answer) {
        const raw = res.data.answer;
        const titleMatch   = raw.match(/TITLE:\s*(.*)/i);
        const insightMatch = raw.match(/INSIGHT:\s*(.*)/i);
        const title   = titleMatch   ? titleMatch[1].trim()   : 'Live Insight';
        const content = insightMatch ? insightMatch[1].trim() : raw;
        addBubble({ type: 'doc', priority: 'High', title: title.toUpperCase(), content });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const startMeeting = async () => {
    try {
      setLoading(true);
      const res = await api.createMeet();
      if (res.success && res.data.meetLink) {
        window.open(res.data.meetLink, '_blank');
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: true });
        setAudioStream(stream);
        setIsListening(true);
        setMeetingActive(true);
        initSpeech();
        setTimeout(() => {
          const v = document.getElementById('meet-mirror') as HTMLVideoElement;
          if (v) v.srcObject = stream;
        }, 500);
      }
    } catch (err) {
      setMeetingActive(true);
      initSpeech();
    } finally {
      setLoading(false);
    }
  };

  const stopListening = () => {
    if (audioStream) audioStream.getTracks().forEach(track => track.stop());
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    setAudioStream(null);
  };

  /* ─── Active meeting view ─── */
  if (meetingActive) {
    return (
      <div className="flex h-full bg-canvas overflow-hidden relative">
        {/* Main Mirror Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-6" style={{ background: 'radial-gradient(circle at center, #0f0f14 0%, #0B0B0E 100%)' }}>
          <div
            className="w-full h-full max-w-6xl flex flex-col relative overflow-hidden"
            style={{ borderRadius: 32, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 80px rgba(66,133,244,0.12)' }}
          >
            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
              {isListening ? (
                <video id="meet-mirror" autoPlay playsInline className="w-full h-full object-contain"/>
              ) : (
                <div className="text-subtle font-bold uppercase tracking-widest text-xs">Mirror disconnected</div>
              )}

              {liveSpeech && (
                <div
                  className="absolute bottom-10 left-10 right-10 p-4 rounded-2xl text-center"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <p className="text-white text-sm font-medium italic opacity-80">"{liveSpeech}"</p>
                </div>
              )}

              {/* LIVE badge */}
              <div
                className="absolute top-6 left-6 flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ background: 'rgba(234,67,53,0.85)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                <span className="text-[11px] font-black text-white uppercase tracking-wider">LIVE</span>
              </div>
            </div>

            {/* Controls */}
            <div
              className="h-20 flex items-center justify-center gap-8"
              style={{ background: 'rgba(13,13,17,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="flex items-center gap-3 px-5 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: isListening ? '#34A853' : '#5F6368', boxShadow: isListening ? '0 0 8px rgba(52,168,83,0.8)' : 'none' }}
                />
                <span className="text-[10px] font-bold uppercase tracking-widest text-subtle">
                  {isListening ? 'Agent Active' : 'Mic off'}
                </span>
              </div>
              <button
                onClick={() => { stopListening(); setMeetingActive(false); }}
                className="px-8 h-12 rounded-2xl font-bold text-sm tracking-tight transition-all cursor-pointer"
                style={{ background: 'rgba(234,67,53,0.12)', color: '#FF8A80', border: '1px solid rgba(234,67,53,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,67,53,0.8)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234,67,53,0.12)'; e.currentTarget.style.color = '#FF8A80'; }}
              >
                Leave meeting
              </button>
            </div>
          </div>

          {/* Processing indicator */}
          <div className="mt-6 h-10 flex items-center justify-center">
            {isTyping && (
              <div
                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl"
                style={{ background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.2)' }}
              >
                <div className="flex gap-1">
                  <span className="dot" style={{ background: '#4285F4' }}/>
                  <span className="dot" style={{ background: '#9334E6' }}/>
                  <span className="dot" style={{ background: '#E8437B' }}/>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#8AB4F8' }}>Searching workspace…</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Copilot Sidebar */}
        <aside
          className="w-[420px] h-full flex flex-col overflow-hidden"
          style={{ background: '#0D0D11', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-ink font-bold text-lg flex items-center gap-2.5">
              <span className="grad-text gem-glow" style={{ fontSize: 18 }}>✦</span> CO-PILOT
            </h3>
            <p className="text-[10px] text-subtle font-bold uppercase tracking-widest mt-1">Direct Insight Engine</p>
          </div>

          <div
            className="flex-1 overflow-y-auto p-5 space-y-4"
            style={{ background: 'radial-gradient(circle at top right, rgba(66,133,244,0.04) 0%, transparent 60%)' }}
          >
            {bubbles.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-10 py-20">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.2)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(138,180,248,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <p className="text-[12px] text-subtle font-semibold uppercase tracking-tight">Passive agent…</p>
                <p className="text-[11px] text-subtle mt-2 leading-relaxed opacity-60">Key insights will surface as topics are mentioned.</p>
              </div>
            )}

            {bubbles.map(bubble => {
              const accentColor = bubble.priority === 'High' ? '#FF8A80' : bubble.priority === 'Medium' ? '#FDD663' : '#8AB4F8';
              const accentBg    = bubble.priority === 'High' ? 'rgba(234,67,53,0.10)' : bubble.priority === 'Medium' ? 'rgba(251,188,5,0.10)' : 'rgba(66,133,244,0.10)';
              const accentBorder= bubble.priority === 'High' ? 'rgba(234,67,53,0.25)' : bubble.priority === 'Medium' ? 'rgba(251,188,5,0.22)' : 'rgba(66,133,244,0.22)';
              return (
                <div
                  key={bubble.id}
                  className="rounded-2xl p-5 slide-in overflow-hidden relative transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderLeft: `3px solid ${accentColor}`,
                  }}
                >
                  <div className="absolute top-0 right-0 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl" style={{ background: accentBg, color: accentColor, borderLeft: `1px solid ${accentBorder}`, borderBottom: `1px solid ${accentBorder}` }}>
                    {bubble.priority}
                  </div>

                  <div className="flex items-start gap-4 mb-3 pr-16">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-ink font-bold text-[12px] uppercase tracking-tight leading-tight">{bubble.title}</p>
                      <p className="text-subtle text-[10px] font-bold mt-1 uppercase tracking-widest">{bubble.timestamp}</p>
                    </div>
                  </div>

                  <p
                    className="text-[13px] font-medium leading-relaxed p-3 rounded-xl mb-4"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', color: '#E8EAED' }}
                  >
                    {bubble.content}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    );
  }

  /* ─── Idle view ─── */
  return (
    <div className="flex flex-col h-full bg-canvas">
      <div
        className="flex-shrink-0 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0D0D11' }}
      >
        <div>
          <h1 className="text-[19px] font-bold text-ink tracking-tight flex items-center gap-3">
            Visio &amp; Meetings
            <span
              className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(66,133,244,0.15)', color: '#8AB4F8', border: '1px solid rgba(66,133,244,0.25)' }}
            >
              Pro
            </span>
          </h1>
          <p className="text-[12px] text-muted mt-1">Real-time workspace intelligence.</p>
        </div>
        <button
          onClick={startMeeting}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)', boxShadow: '0 2px 12px rgba(66,133,244,0.3)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(66,133,244,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(66,133,244,0.3)'; }}
        >
          <VideoIcon />
          {loading ? 'Launching…' : 'Launch Meet'}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.2)' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(138,180,248,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <h2 className="text-[22px] font-bold text-ink tracking-tight">Activate your meeting co-pilot</h2>
        <p className="text-muted mt-2 max-w-sm text-center text-[14px] leading-relaxed">
          Click the button above to start an AI-assisted meeting. Your workspace context will surface in real time.
        </p>
      </div>
    </div>
  );
}
