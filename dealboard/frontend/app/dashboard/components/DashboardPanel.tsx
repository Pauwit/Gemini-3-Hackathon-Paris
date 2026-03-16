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

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
    </svg>
  );
}
function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
}

function Panel({
  accentColor, title, headerIcon, children, onToggleExpand, isExpanded
}: {
  accentColor: string;
  title: string;
  headerIcon: React.ReactNode;
  children: React.ReactNode;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}) {
  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 m-auto max-w-5xl' : 'min-h-0'
      }`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: isExpanded
          ? '0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.7)'
          : '0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Accent top border */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}, transparent)`, borderRadius: '16px 16px 0 0' }} />

      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: accentColor }}>{headerIcon}</span>
          <h2 className="text-[12px] font-semibold tracking-wide uppercase" style={{ color: 'rgba(232,234,237,0.75)', letterSpacing: '0.06em' }}>{title}</h2>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          style={{ color: 'rgba(154,160,166,0.6)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#E8EAED'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(154,160,166,0.6)'; }}
          title={isExpanded ? 'Close' : 'Expand'}
        >
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {children}
      </div>
    </div>
  );
}

/* Panel header icons (small SVGs) */
function AdviceIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function ProjectIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function CalendarIconPanel() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function PeopleIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function MeetingIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
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
          className="fixed inset-0 z-40 fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setExpandedPanel(null)}
        />
      )}

      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0D0D11' }}
      >
        <div>
          <h1 className="text-[16px] font-bold text-ink tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
          </h1>
          <p className="text-[12px] text-subtle mt-0.5">Workspace intelligence · Gmail, Drive &amp; Calendar</p>
        </div>
        <div className="flex items-center gap-3">
          {!geminiConnected && (
            <button
              onClick={onNeedSettings}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all cursor-pointer"
              style={{ background: 'rgba(251,188,5,0.15)', border: '1px solid rgba(251,188,5,0.25)', color: '#FDD663' }}
            >
              <KeyIcon /> Add Gemini key
            </button>
          )}
          {err && <span className="text-[12px] font-medium" style={{ color: '#FF8A80' }}>{err}</span>}
          {insights?.lastScanTime && <span className="text-[11px] text-subtle">{ago(insights.lastScanTime)}</span>}
          <button
            onClick={scan} disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)', boxShadow: '0 2px 8px rgba(66,133,244,0.25)' }}
          >
            <span className={scanning ? 'spin inline-block' : 'inline-block'}><RefreshIcon /></span>
            {scanning ? 'Scanning…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* First scan loading */}
      {isLoading && !insights?.lastScanTime && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="grad-text gem-glow mb-4" style={{ fontSize: 48, lineHeight: 1 }}>✦</div>
            <p className="text-[15px] font-bold text-ink mb-2">{scanning ? 'Scanning your workspace…' : 'Loading…'}</p>
            <div className="flex justify-center gap-1.5 mt-3">
              <span className="dot" style={{ background: '#4285F4' }}/>
              <span className="dot" style={{ background: '#9334E6' }}/>
              <span className="dot" style={{ background: '#E8437B' }}/>
            </div>
          </div>
        </div>
      )}

      {/* Bento grid */}
      {(!isLoading || insights?.lastScanTime) && (
        <div
          className="flex-1 min-h-0 p-4"
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr',
          }}
        >
          {/* Left column: Advice + Projects */}
          <div className="flex flex-col gap-2.5 min-h-0">
            <div className="flex-1 min-h-0">
              <Panel
                accentColor="#FF6E6E"
                title="Strategic Advice"
                headerIcon={<AdviceIcon />}
                isExpanded={expandedPanel === 'advice'}
                onToggleExpand={() => toggleExpand('advice')}
              >
                <AdviceSection advice={insights?.advice ?? []} loading={isLoading}/>
              </Panel>
            </div>
            <div className="flex-1 min-h-0">
              <Panel
                accentColor="#34A853"
                title="Active Projects"
                headerIcon={<ProjectIcon />}
                isExpanded={expandedPanel === 'projects'}
                onToggleExpand={() => toggleExpand('projects')}
              >
                <ProjectsSection projects={insights?.projects ?? []} loading={isLoading}/>
              </Panel>
            </div>
          </div>

          {/* Calendar — middle */}
          <div className="min-h-0">
            <Panel
              accentColor="#4285F4"
              title="Upcoming Events"
              headerIcon={<CalendarIconPanel />}
              isExpanded={expandedPanel === 'calendar'}
              onToggleExpand={() => toggleExpand('calendar')}
            >
              <CalendarSection events={insights?.calendar ?? []} loading={isLoading}/>
            </Panel>
          </div>

          {/* Right column: People + Meetings */}
          <div className="flex flex-col gap-2.5 min-h-0">
            <div className="flex-1 min-h-0">
              <Panel
                accentColor="#9334E6"
                title="People Briefings"
                headerIcon={<PeopleIcon />}
                isExpanded={expandedPanel === 'people'}
                onToggleExpand={() => toggleExpand('people')}
              >
                <PeopleSection people={insights?.people ?? []} loading={isLoading}/>
              </Panel>
            </div>
            <div className="flex-1 min-h-0">
              <Panel
                accentColor="#FFA000"
                title="Meeting Summaries"
                headerIcon={<MeetingIcon />}
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
