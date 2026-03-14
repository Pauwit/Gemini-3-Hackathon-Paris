'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Insights, MeetingSummary } from '@/lib/types';
import { api } from '@/lib/api';

interface Bubble {
  id: string;
  type: 'doc' | 'info' | 'action';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  content: string;
  timestamp: string;
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

  useEffect(() => {
    load();
  }, [load]);

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
        // Parse TITLE: and INSIGHT: from AI response
        const titleMatch = raw.match(/TITLE:\s*(.*)/i);
        const insightMatch = raw.match(/INSIGHT:\s*(.*)/i);
        
        const title = titleMatch ? titleMatch[1].trim() : 'Live Insight';
        const content = insightMatch ? insightMatch[1].trim() : raw;

        addBubble({
          type: 'doc',
          priority: 'High',
          title: title.toUpperCase(),
          content: content
        });
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

  if (meetingActive) {
    return (
      <div className="flex h-full bg-black overflow-hidden relative font-sans">
        {/* Main Mirror Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
           <div className="w-full h-full max-w-6xl bg-zinc-950 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)] flex flex-col relative border border-white/5">
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                 {isListening ? (
                   <video id="meet-mirror" autoPlay playsInline className="w-full h-full object-contain" />
                 ) : (
                   <div className="text-zinc-800 font-bold uppercase tracking-widest text-xs">Miroir déconnecté</div>
                 )}
                 {liveSpeech && (
                   <div className="absolute bottom-10 left-10 right-10 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-center shadow-2xl">
                      <p className="text-white text-sm font-medium italic opacity-80">"{liveSpeech}"</p>
                   </div>
                 )}
                 <div className="absolute top-8 left-8 flex items-center gap-2 bg-red-500 px-4 py-1.5 rounded-full border border-white/20">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">LIVE</span>
                 </div>
              </div>

              {/* Controls */}
              <div className="h-24 flex items-center justify-center gap-8 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
                 <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/5">
                    <span className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                       {isListening ? 'Agent Actif' : 'Micro désactivé'}
                    </span>
                 </div>
                 <button onClick={() => { stopListening(); setMeetingActive(false); }} className="px-10 h-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all font-black text-sm tracking-tight shadow-xl">
                  Quitter
                 </button>
              </div>
           </div>

           {/* Processing Indicator */}
           <div className="mt-8 h-12 flex items-center justify-center">
              {isTyping && (
                <div className="flex items-center gap-3 bg-indigo-500/10 px-6 py-3 rounded-2xl border border-indigo-500/20 animate-pulse">
                   <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" /><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" /></div>
                   <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Recherche en cours...</span>
                </div>
              )}
           </div>
        </div>

        {/* AI Sidebar */}
        <aside className="w-[450px] h-full bg-zinc-950 border-l border-white/5 flex flex-col shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
             <h3 className="text-white font-black text-xl flex items-center gap-2 tracking-tight">
                <span className="text-indigo-500">✦</span> CO-PILOT
             </h3>
             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Direct Insight Engine</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent">
            {bubbles.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-12 opacity-30">
                 <div className="text-5xl mb-6">👂</div>
                 <p className="text-sm text-zinc-400 font-black uppercase tracking-tight">Agent passif...</p>
                 <p className="text-xs text-zinc-600 mt-3 leading-relaxed">Je fais apparaître les infos clés dès qu'elles sont mentionnées.</p>
              </div>
            )}
            {bubbles.map(bubble => (
              <div key={bubble.id} className="group bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 shadow-xl slide-in overflow-hidden relative hover:bg-zinc-900/60 transition-all hover:scale-[1.02] border-l-4" 
                   style={{ borderLeftColor: bubble.priority === 'High' ? '#ef4444' : bubble.priority === 'Medium' ? '#f59e0b' : '#6366f1' }}>
                
                <div className={`absolute top-0 right-0 px-5 py-2 text-[10px] font-black uppercase rounded-bl-3xl ${
                  bubble.priority === 'High' ? 'bg-red-500/20 text-red-500 border-l border-b border-red-500/30' :
                  bubble.priority === 'Medium' ? 'bg-amber-500/20 text-amber-500 border-l border-b border-amber-500/30' :
                  'bg-indigo-500/20 text-indigo-500 border-l border-b border-indigo-500/30'
                }`}>
                  {bubble.priority}
                </div>

                <div className="flex items-start gap-5 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                    bubble.priority === 'High' ? 'bg-red-500/20 text-red-400' : 
                    bubble.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 
                    'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {bubble.type === 'doc' ? '📄' : '💡'}
                  </div>
                  <div>
                    <p className="text-zinc-100 font-black text-sm uppercase tracking-tight leading-tight">{bubble.title}</p>
                    <p className="text-zinc-500 text-[9px] font-bold mt-1 uppercase tracking-widest">{bubble.timestamp}</p>
                  </div>
                </div>
                
                <p className="text-zinc-200 text-sm font-medium leading-relaxed mb-5 bg-black/40 p-4 rounded-2xl border border-white/5">
                  {bubble.content}
                </p>

                <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 group/btn">
                  Ouvrir <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas">
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-6 bg-white border-b border-border">
        <div>
          <h1 className="text-[20px] font-extrabold text-ink tracking-tight">Visio & Meetings <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase ml-3">Pro</span></h1>
          <p className="text-[12px] text-muted mt-1">Intelligence Workspace en temps réel.</p>
        </div>
        <button onClick={startMeeting} disabled={loading} className="px-6 py-2.5 rounded-xl text-[14px] font-bold text-white transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
          {loading ? '🚀 Lancement...' : '🚀 Lancer le Meet'}
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-20">
         <div className="text-6xl mb-6">🎙️</div>
         <h2 className="text-2xl font-black text-zinc-800 tracking-tight">Activez votre copilote de réunion</h2>
         <p className="text-zinc-500 mt-2 max-w-sm text-center">Cliquez sur le bouton en haut à droite pour une réunion assistée par l'IA.</p>
      </div>
    </div>
  );
}
