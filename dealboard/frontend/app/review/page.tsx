// ============================================================
// app/review/page.tsx — Post-Meeting Review Page
// ============================================================
//
// PURPOSE:
// Post-meeting document review experience. Two-panel layout:
//   Left panel:  Meeting selector list (past meetings)
//   Right panel: Document tabs — Summary, Follow-Up Email,
//                Strategy Brief, Decision Log
//
// DATA FLOW:
//   GET /api/meetings              → left meeting list
//   GET /api/meetings/:id/documents → right document tabs
//   Mock fallback → mock-meetings.json + mock-documents.json
//   WebSocketProvider.documents    → live docs if just generated
//
// URL PARAM: ?meeting=<id> pre-selects a meeting on load.
//
// GENERATE FLOW:
//   If no documents yet and meeting exists → show "Generate" button
//   → generateDocuments() via WebSocket → documents arrive via WS
//
// MOCK MODE: ?mock=true loads from mock-data/ JSON files.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (REST endpoints)
// DEPENDENCIES: MeetingSummary, FollowUpEmail, StrategyBrief,
//               DecisionLog, DocumentExport, useWebSocketContext
// ============================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams }   from 'next/navigation';
import { FileText, Zap, Calendar, Clock, Users } from 'lucide-react';
import { MeetingSummary }    from './components/MeetingSummary';
import { FollowUpEmail }     from './components/FollowUpEmail';
import { StrategyBrief }     from './components/StrategyBrief';
import { DecisionLog }       from './components/DecisionLog';
import { DocumentExport }    from './components/DocumentExport';
import { Button }            from '../../components/ui/Button';
import { Badge }             from '../../components/ui/Badge';
import { useWebSocketContext } from '../../components/providers/WebSocketProvider';
import { config }            from '../../lib/config';
import type { Meeting, Document, DocumentType } from '../../lib/types';

// ── Tab config ────────────────────────────────────────────

const TABS: { key: DocumentType; label: string }[] = [
  { key: 'summary',          label: 'Summary'       },
  { key: 'follow-up-email',  label: 'Follow-Up'     },
  { key: 'strategy-brief',   label: 'Strategy Brief'},
  { key: 'decision-log',     label: 'Decision Log'  },
];

// ── Helpers ───────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDur(mins: number) {
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Component ─────────────────────────────────────────────

/**
 * ReviewPage
 * Left: meeting selector. Right: tabbed document viewer with export.
 */
export default function ReviewPage() {
  const searchParams = useSearchParams();
  const isMock       = searchParams?.get('mock') === 'true';
  const initMeetingId = searchParams?.get('meeting') ?? null;

  const { documents: wsDocuments, generateDocuments } = useWebSocketContext();

  const [meetings,         setMeetings]         = useState<Meeting[]>([]);
  const [selectedMeeting,  setSelectedMeeting]  = useState<string | null>(initMeetingId);
  const [documents,        setDocuments]         = useState<Document[]>([]);
  const [activeTab,        setActiveTab]         = useState<DocumentType>('summary');
  const [loadingMeetings,  setLoadingMeetings]   = useState(true);
  const [loadingDocs,      setLoadingDocs]       = useState(false);
  const [generating,       setGenerating]        = useState(false);

  // ── Load meetings ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        if (!isMock) {
          const res = await fetch(`${config.API_URL}/api/meetings`);
          if (res.ok) { setMeetings((await res.json()).meetings ?? []); return; }
        }
        const m = await import('../../mock-data/mock-meetings.json');
        setMeetings(m.default as Meeting[]);
      } catch {
        try {
          const m = await import('../../mock-data/mock-meetings.json');
          setMeetings(m.default as Meeting[]);
        } catch { setMeetings([]); }
      } finally { setLoadingMeetings(false); }
    }
    load();
  }, [isMock]);

  // Auto-select first meeting if none selected
  useEffect(() => {
    if (!selectedMeeting && meetings.length > 0) {
      setSelectedMeeting(meetings[0].id);
    }
  }, [meetings, selectedMeeting]);

  // ── Load documents for selected meeting ───────────────
  const loadDocuments = useCallback(async (meetingId: string) => {
    setLoadingDocs(true);
    try {
      if (!isMock) {
        const res = await fetch(`${config.API_URL}/api/meetings/${meetingId}/documents`);
        if (res.ok) { setDocuments((await res.json()).documents ?? []); return; }
      }
      const m = await import('../../mock-data/mock-documents.json');
      setDocuments(m.default as Document[]);
    } catch {
      try {
        const m = await import('../../mock-data/mock-documents.json');
        setDocuments(m.default as Document[]);
      } catch { setDocuments([]); }
    } finally { setLoadingDocs(false); }
  }, [isMock]);

  useEffect(() => {
    if (selectedMeeting) loadDocuments(selectedMeeting);
  }, [selectedMeeting, loadDocuments]);

  // Merge WS documents (freshly generated) over loaded ones
  useEffect(() => {
    if (wsDocuments.length > 0) {
      setDocuments((prev) => {
        const merged = [...prev];
        for (const wsd of wsDocuments) {
          const idx = merged.findIndex((d) => d.documentId === wsd.documentId);
          if (idx >= 0) merged[idx] = wsd;
          else merged.push(wsd);
        }
        return merged;
      });
      setGenerating(false);
    }
  }, [wsDocuments]);

  // ── Generate documents ─────────────────────────────────
  function handleGenerate() {
    if (!selectedMeeting) return;
    setGenerating(true);
    generateDocuments(selectedMeeting, ['summary', 'follow-up-email', 'strategy-brief', 'decision-log']);
  }

  // ── Find active documents ──────────────────────────────
  const selectedMeetingData = meetings.find((m) => m.id === selectedMeeting);
  function docFor(type: DocumentType): Document | undefined {
    return documents.find((d) => d.type === type);
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: '#F8F9FA' }}>

      {/* ── Left: Meeting list ──────────────────────────── */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ width: 260, borderRight: '1px solid #E8EAED', backgroundColor: '#FFFFFF' }}
      >
        <div className="px-4 py-4" style={{ borderBottom: '1px solid #E8EAED' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <FileText size={15} style={{ color: '#4285F4' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#202124' }}>Review</h2>
          </div>
          <p className="text-xs" style={{ color: '#9AA0A6' }}>Post-meeting documents</p>
        </div>

        <div className="py-2">
          {loadingMeetings ? (
            <div className="px-4 py-3 space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: '#F1F3F4' }} />
              ))}
            </div>
          ) : meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMeeting(m.id)}
              className="w-full text-left px-4 py-3 transition-colors hover:bg-gray-50"
              style={{
                backgroundColor: selectedMeeting === m.id ? '#E8F0FE' : 'transparent',
                borderLeft: selectedMeeting === m.id ? '3px solid #4285F4' : '3px solid transparent',
              }}
            >
              <p
                className="text-xs font-semibold truncate mb-0.5"
                style={{ color: selectedMeeting === m.id ? '#4285F4' : '#202124' }}
              >
                {m.title}
              </p>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#9AA0A6' }}>
                  <Calendar size={9} />
                  {fmtDate(m.date)}
                </span>
                <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#9AA0A6' }}>
                  <Clock size={9} />
                  {fmtDur(m.duration)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Right: Documents ────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedMeetingData ? (
          <>
            {/* Meeting header */}
            <div
              className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
              style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8EAED' }}
            >
              <div>
                <h1 className="text-base font-bold" style={{ color: '#202124' }}>
                  {selectedMeetingData.title}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#9AA0A6' }}>
                    <Calendar size={11} />
                    {fmtDate(selectedMeetingData.date)}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#9AA0A6' }}>
                    <Users size={11} />
                    {selectedMeetingData.participants?.join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {documents.length === 0 && (
                  <Button
                    variant="gemini"
                    size="sm"
                    loading={generating}
                    leftIcon={<Zap size={13} />}
                    onClick={handleGenerate}
                  >
                    Generate Documents
                  </Button>
                )}
                {documents.length > 0 && (
                  <Badge variant="success" dot>
                    {documents.length} docs ready
                  </Badge>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div
              className="flex gap-0 flex-shrink-0 px-6"
              style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8EAED' }}
            >
              {TABS.map((tab) => {
                const hasDoc = Boolean(docFor(tab.key));
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="px-4 py-3 text-xs font-medium border-b-2 transition-colors"
                    style={{
                      color:       activeTab === tab.key ? '#4285F4' : '#5F6368',
                      borderColor: activeTab === tab.key ? '#4285F4' : 'transparent',
                      opacity:     !hasDoc && !generating ? 0.5 : 1,
                    }}
                  >
                    {tab.label}
                    {hasDoc && (
                      <span
                        className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: '#34A853' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Document content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDocs || generating ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4">
                  <div className="flex gap-1.5">
                    {[0,1,2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: '#4285F4',
                          animation: `geminiDot 1.4s ease-in-out infinite`,
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: '#5F6368' }}>
                    {generating ? 'Generating documents with Gemini…' : 'Loading…'}
                  </p>
                </div>
              ) : (
                <div className="max-w-3xl space-y-6">
                  {activeTab === 'summary'         && <MeetingSummary   document={docFor('summary')} />}
                  {activeTab === 'follow-up-email'  && <FollowUpEmail    document={docFor('follow-up-email')} />}
                  {activeTab === 'strategy-brief'   && <StrategyBrief   document={docFor('strategy-brief')} />}
                  {activeTab === 'decision-log'     && <DecisionLog     document={docFor('decision-log')} />}

                  {documents.length > 0 && (
                    <DocumentExport
                      documents={documents}
                      meetingTitle={selectedMeetingData.title}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} style={{ color: '#E8EAED', margin: '0 auto 12px' }} />
              <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>
                Select a meeting to review its documents
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
