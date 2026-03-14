'use client';

import { useEffect, useState, useCallback } from 'react';
import { Insights } from '@/lib/types';
import { api } from '@/lib/api';
import AdviceSection from './AdviceSection';
import CalendarSection from './CalendarSection';
import ProjectsSection from './ProjectsSection';
import PeopleSection from './PeopleSection';
import MeetingSummariesSection from './MeetingSummariesSection';

interface Props { geminiConnected: boolean; onNeedSettings: () => void; }

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

type PanelId = 'advice' | 'projects' | 'calendar' | 'people' | 'meetings' | null;

function Panel({
  emoji, title, color, headerBg, headerBorder, children, onToggleExpand, isExpanded
}: {
  emoji: string; title: string; color: string;
  headerBg: string; headerBorder: string; children: React.ReactNode;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}) {
  return (
    <div 
      className={`flex flex-col h-full bg-white rounded-2xl border border-border overflow-hidden shadow-soft transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 m-auto max-w-5xl shadow-pop' : 'min-h-0'
      }`}
    >
      {/* Section header */}
      <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 border-b ${headerBg}`} style={{ borderColor: headerBorder }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{emoji}</span>
          <h2 className="text-[13px] font-bold tracking-tight" style={{ color }}>{title}</h2>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-muted hover:text-ink"
          title={isExpanded ? "Close" : "Expand"}
        >
          {isExpanded ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          )}
        </button>
      </div>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {children}
      </div>
    </div>
  );
}

export default function DashboardPanel({ geminiConnected, onNeedSettings }: Props) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [scanning, setScanning] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<PanelId>(null);

  const load = useCallback(async () => {
    try { const r = await api.getInsights(); if (r.success) setInsights(r.data); } catch {}
  }, []);

  const scan = useCallback(async () => {
    setScanning(true); setErr(null);
    try { await api.triggerScan(); await load(); }
    catch (e: any) { setErr(e.message || 'Scan failed'); }
    finally { setScanning(false); }
  }, [load]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => { if (!loading && insights && !insights.lastScanTime && geminiConnected) scan(); }, [loading, insights, geminiConnected, scan]);
  useEffect(() => { const id = setInterval(load, 60_000); return () => clearInterval(id); }, [load]);

  const isLoading = loading || (scanning && !insights?.lastScanTime);

  const toggleExpand = (id: PanelId) => {
    setExpandedPanel(prev => prev === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-canvas relative">
      
      {/* Backdrop for expanded panel */}
      {expandedPanel && (
        <div 
          className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 fade-in" 
          onClick={() => setExpandedPanel(null)}
        />
      )}

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-border">
        <div>
          <h1 className="text-[17px] font-extrabold text-ink tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} 👋
          </h1>
          <p className="text-[12px] text-muted mt-0.5">Workspace intelligence — auto-generated from Gmail, Drive & Calendar</p>
        </div>
        <div className="flex items-center gap-3">
          {!geminiConnected && (
            <button onClick={onNeedSettings} className="px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
              🔑 Add Gemini key
            </button>
          )}
          {err && <span className="text-[12px] text-red-600 font-medium">{err}</span>}
          {insights?.lastScanTime && <span className="text-[12px] text-subtle">{ago(insights.lastScanTime)}</span>}
          <button
            onClick={scan} disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
          >
            <span className={scanning ? 'spin inline-block' : 'inline-block'} style={{ fontSize: 14 }}>↻</span>
            {scanning ? 'Scanning…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* First scan loading */}
      {isLoading && !insights?.lastScanTime && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">{scanning ? '⚡' : '✦'}</div>
            <p className="text-[15px] font-bold text-ink mb-2">{scanning ? 'Scanning your workspace…' : 'Loading…'}</p>
            <div className="flex justify-center gap-1.5 mt-3">
              <span className="dot" style={{ background: '#6366F1' }}/>
              <span className="dot" style={{ background: '#8B5CF6' }}/>
              <span className="dot" style={{ background: '#EC4899' }}/>
            </div>
          </div>
        </div>
      )}

      {/* Bento grid — fills remaining height */}
      {(!isLoading || insights?.lastScanTime) && (
        <div
          className="flex-1 min-h-0 p-4"
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr',
          }}
        >
          {/* Left column: Advice + Projects stacked */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <Panel 
                emoji="🎯" title="Strategic Advice" color="#DC2626" headerBg="bg-red-50" headerBorder="#FECACA"
                isExpanded={expandedPanel === 'advice'}
                onToggleExpand={() => toggleExpand('advice')}
              >
                <AdviceSection advice={insights?.advice ?? []} loading={isLoading}/>
              </Panel>
            </div>
            <div className="flex-1 min-h-0">
              <Panel 
                emoji="🚀" title="Active Projects" color="#059669" headerBg="bg-emerald-50" headerBorder="#6EE7B7"
                isExpanded={expandedPanel === 'projects'}
                onToggleExpand={() => toggleExpand('projects')}
              >
                <ProjectsSection projects={insights?.projects ?? []} loading={isLoading}/>
              </Panel>
            </div>
          </div>

          {/* 📅 Calendar — middle */}
          <div className="min-h-0">
            <Panel 
              emoji="📅" title="Upcoming Events" color="#2563EB" headerBg="bg-blue-50" headerBorder="#93C5FD"
              isExpanded={expandedPanel === 'calendar'}
              onToggleExpand={() => toggleExpand('calendar')}
            >
              <CalendarSection events={insights?.calendar ?? []} loading={isLoading}/>
            </Panel>
          </div>

          {/* Right column: People + Meetings stacked */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <Panel 
                emoji="👥" title="People Briefings" color="#7C3AED" headerBg="bg-violet-50" headerBorder="#C4B5FD"
                isExpanded={expandedPanel === 'people'}
                onToggleExpand={() => toggleExpand('people')}
              >
                <PeopleSection people={insights?.people ?? []} loading={isLoading}/>
              </Panel>
            </div>
            <div className="flex-1 min-h-0">
              <Panel 
                emoji="📝" title="Meeting Summaries" color="#D97706" headerBg="bg-amber-50" headerBorder="#FCD34D"
                isExpanded={expandedPanel === 'meetings'}
                onToggleExpand={() => toggleExpand('meetings')}
              >
                <MeetingSummariesSection meetings={insights?.meetingSummaries ?? []} loading={isLoading}/>
              </Panel>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
