'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Insights } from '@/lib/types';
import { api } from '@/lib/api';

const WS_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001')
  .replace(/^http/, 'ws') + '/audio';

interface Bubble {
  id: string;
  type: 'doc' | 'info' | 'action';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  content: string;
  timestamp: string;
}

interface SummarySegment {
  timestamp: string;
  text: string;
}

interface MeetingRecap {
  summary: string;
  decisions: string[];
  actionItems: { who: string; what: string; deadline: string | null }[];
  keyTopics: string[];
  nextSteps: string[];
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
  const [transcript, setTranscript] = useState<SummarySegment[]>([]);
  const [activeTab, setActiveTab] = useState<'copilot' | 'transcript'>('copilot');
  const [recap, setRecap] = useState<MeetingRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const transcriptRef = useRef<SummarySegment[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const speechBufferRef = useRef<string[]>([]);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getInsights();
      if (res.success) setInsights(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep ref in sync with state for access inside WS callbacks
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const addBubble = (bubble: Omit<Bubble, 'id' | 'timestamp'>) => {
    const newBubble: Bubble = {
      ...bubble,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setBubbles(prev => [newBubble, ...prev]);
  };

  // Web Speech API — instant visual feedback + transcript/insight source
  const initSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }

      if (finalTranscript.trim()) {
        // Accumulate final speech into a buffer
        speechBufferRef.current.push(finalTranscript.trim());

        // Check for keywords → trigger copilot insight immediately
        const lower = finalTranscript.toLowerCase();
        const keywords = [
          'projet', 'contrat', 'budget', 'client', 'document',
          'stratégie', 'deadline', 'prix', 'offre', 'deal',
          'négociation', 'réunion', 'facture',
          'project', 'contract', 'roadmap', 'email', 'strategy',
          'invoice', 'proposal', 'meeting', 'negotiation',
        ];
        if (keywords.some(k => lower.includes(k))) {
          processContext(finalTranscript.trim());
        }

        // Flush buffer as a transcript segment every ~15s or 5 sentences
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        if (speechBufferRef.current.length >= 5) {
          const text = speechBufferRef.current.join(' ');
          speechBufferRef.current = [];
          setTranscript(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            text,
          }]);
        } else {
          speechTimerRef.current = setTimeout(() => {
            if (speechBufferRef.current.length > 0) {
              const text = speechBufferRef.current.join(' ');
              speechBufferRef.current = [];
              setTranscript(prev => [...prev, {
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                text,
              }]);
            }
          }, 15000);
        }
      }

      setLiveSpeech(finalTranscript || interimTranscript);
    };

    recognition.onend = () => { if (recognitionRef.current) recognition.start(); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const processContext = useCallback(async (text: string) => {
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
  }, []);

  /**
   * Audio streaming via WebSocket.
   * Mixes tab audio (all participants) + local mic, streams to backend for Gemini transcription.
   */
  const initAudioStreaming = useCallback(async (displayStream: MediaStream) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      try {
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        // Tab audio: all Meet participants
        const tabAudioTracks = displayStream.getAudioTracks();
        if (tabAudioTracks.length > 0) {
          const tabAudioStream = new MediaStream([tabAudioTracks[0]]);
          audioCtx.createMediaStreamSource(tabAudioStream).connect(dest);
        } else {
          console.warn('[Audio] No audio track from display capture — remote participants may not be transcribed');
        }

        // Mic audio: local user
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          audioCtx.createMediaStreamSource(micStream).connect(dest);
        } catch {
          console.warn('[Audio] Microphone access denied — only tab audio will be transcribed');
        }

        // Check supported MIME type
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(dest.stream, { mimeType });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        recorder.start(5000); // 5-second chunks
      } catch (err) {
        console.error('[Audio] Failed to set up audio streaming:', err);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'summary' && msg.text) {
          const segment: SummarySegment = { timestamp: msg.timestamp, text: msg.text };
          setTranscript(prev => [...prev, segment]);
        } else if (msg.type === 'context_trigger' && msg.text) {
          processContext(msg.text);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (e) => {
      console.error('[WS] Audio WebSocket error — URL:', WS_URL, e);
      setIsListening(false);
    };
    ws.onclose = (e) => {
      console.log('[WS] Audio WebSocket closed', e.code, e.reason);
      setIsListening(false);
    };
  }, [processContext]);

  const startMeeting = async () => {
    try {
      setLoading(true);
      setTranscript([]);
      setRecap(null);
      setShowRecap(false);
      speechBufferRef.current = [];
      if (speechTimerRef.current) { clearTimeout(speechTimerRef.current); speechTimerRef.current = null; }

      const res = await api.createMeet();
      if (res.success && res.data.meetLink) {
        window.open(res.data.meetLink, '_blank');
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: true,
        });
        setAudioStream(stream);
        setIsListening(true);
        setMeetingActive(true);
        initSpeech();
        initAudioStreaming(stream);
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

  const generateRecap = async () => {
    const segments = transcriptRef.current;
    if (segments.length === 0) {
      setShowRecap(true);
      return;
    }
    setRecapLoading(true);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001') + '/api/meeting/recap',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments }),
        }
      );
      const data = await res.json();
      if (data.success) setRecap(data.data);
    } catch (err) {
      console.error('Recap error:', err);
    } finally {
      setRecapLoading(false);
      setShowRecap(true);
    }
  };

  const stopMeeting = async () => {
    // Stop all media and WS
    if (audioStream) audioStream.getTracks().forEach(t => t.stop());
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    if (wsRef.current) wsRef.current.close();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    // Flush any remaining buffered speech
    if (speechBufferRef.current.length > 0) {
      const text = speechBufferRef.current.join(' ');
      speechBufferRef.current = [];
      setTranscript(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text,
      }]);
    }
    setIsListening(false);
    setAudioStream(null);
    setLiveSpeech('');

    // Generate recap before leaving
    await generateRecap();
    setMeetingActive(false);
  };

  /* ─── Recap view (post-meeting) ─── */
  if (showRecap) {
    return (
      <div className="flex flex-col h-full bg-canvas overflow-y-auto">
        <div
          className="flex-shrink-0 flex items-center justify-between px-8 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0D0D11' }}
        >
          <div>
            <h1 className="text-[19px] font-bold text-ink tracking-tight">Meeting Recap</h1>
            <p className="text-[12px] text-muted mt-1">{transcript.length} summaries generated</p>
          </div>
          <button
            onClick={() => setShowRecap(false)}
            className="px-5 py-2 rounded-xl text-[13px] font-bold cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#E8EAED', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Back
          </button>
        </div>

        {recapLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="dot" style={{ background: '#4285F4' }}/>
                <span className="dot" style={{ background: '#9334E6' }}/>
                <span className="dot" style={{ background: '#E8437B' }}/>
              </div>
              <span className="text-[13px] font-bold uppercase tracking-widest" style={{ color: '#8AB4F8' }}>Generating recap…</span>
            </div>
          </div>
        ) : recap ? (
          <div className="flex-1 p-8 space-y-6 max-w-3xl mx-auto w-full">
            {/* Summary */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#8AB4F8' }}>Summary</p>
              <p className="text-[14px] text-ink leading-relaxed">{recap.summary}</p>
            </div>

            {/* Key Topics */}
            {recap.keyTopics?.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-subtle">Key Topics</p>
                <div className="flex flex-wrap gap-2">
                  {recap.keyTopics.map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(147,52,230,0.12)', color: '#C084FC', border: '1px solid rgba(147,52,230,0.25)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions */}
            {recap.decisions?.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-subtle">Decisions</p>
                <ul className="space-y-2">
                  {recap.decisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px] text-ink">
                      <span style={{ color: '#34A853', marginTop: 2 }}>✓</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {recap.actionItems?.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-subtle">Action Items</p>
                <div className="space-y-3">
                  {recap.actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(251,188,5,0.06)', border: '1px solid rgba(251,188,5,0.15)' }}>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'rgba(251,188,5,0.15)', color: '#FDD663' }}>{item.who}</span>
                      <div>
                        <p className="text-[13px] text-ink">{item.what}</p>
                        {item.deadline && <p className="text-[11px] mt-1" style={{ color: '#FDD663' }}>→ {item.deadline}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {recap.nextSteps?.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-subtle">Next Steps</p>
                <ul className="space-y-2">
                  {recap.nextSteps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px] text-ink">
                      <span style={{ color: '#8AB4F8', marginTop: 2 }}>→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transcript raw */}
            {transcript.length > 0 && (
              <details className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <summary className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-subtle cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  Live Summaries ({transcript.length})
                </summary>
                <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
                  {transcript.map((seg, i) => (
                    <div key={i}>
                      <span className="text-[10px] font-bold" style={{ color: '#5F6368' }}>{seg.timestamp}</span>
                      <p className="text-[12px] text-ink mt-0.5 leading-relaxed">{seg.text}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-subtle text-[13px]">No transcript available to generate recap.</p>
          </div>
        )}
      </div>
    );
  }

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

              {/* Transcript badge — show last segment */}
              {transcript.length > 0 && (
                <div
                  className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer"
                  style={{ background: 'rgba(52,168,83,0.85)', backdropFilter: 'blur(8px)' }}
                  onClick={() => { setActiveTab('transcript'); }}
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                  <span className="text-[11px] font-black text-white uppercase tracking-wider">{transcript.length} summaries</span>
                </div>
              )}
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
                onClick={stopMeeting}
                className="px-8 h-12 rounded-2xl font-bold text-sm tracking-tight transition-all cursor-pointer"
                style={{ background: 'rgba(234,67,53,0.12)', color: '#FF8A80', border: '1px solid rgba(234,67,53,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,67,53,0.8)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234,67,53,0.12)'; e.currentTarget.style.color = '#FF8A80'; }}
              >
                Leave &amp; Recap
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
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {(['copilot', 'transcript'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                style={{
                  color: activeTab === tab ? '#E8EAED' : '#5F6368',
                  borderBottom: activeTab === tab ? '2px solid #4285F4' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {tab === 'copilot' ? '✦ Co-Pilot' : `Summary${transcript.length > 0 ? ` (${transcript.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* Co-Pilot tab */}
          {activeTab === 'copilot' && (
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
          )}

          {/* Transcript tab */}
          {activeTab === 'transcript' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-10 py-20">
                  <p className="text-[12px] text-subtle font-semibold uppercase tracking-tight">Listening…</p>
                  <p className="text-[11px] text-subtle mt-2 opacity-60">A summary will appear every 15 seconds.</p>
                </div>
              ) : (
                <>
                  {transcript.map((seg, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: '#5F6368' }}>{seg.timestamp}</span>
                      <p className="text-[12px] text-ink mt-1 leading-relaxed">{seg.text}</p>
                    </div>
                  ))}
                  <div ref={transcriptEndRef}/>
                </>
              )}
            </div>
          )}
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
