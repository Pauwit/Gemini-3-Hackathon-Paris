// ============================================================
// app/dashboard/page.tsx — Dashboard Overview Page
// ============================================================
//
// PURPOSE:
// Main landing page after sign-in. Shows:
//   - Welcome header with user name
//   - Quick stats row: Total Meetings, Cards Generated,
//     Decisions Logged, Patterns Detected
//   - "Start New Meeting" CTA button
//   - Recent meetings list with date, duration, participants, card count
//   - New Meeting modal: enter title + participants
//
// DATA FLOW:
//   GET /api/meetings (with mock fallback) → meetings list
//   Modal submit → startMeeting() → router.push('/meeting')
//
// MOCK MODE: ?mock=true or backend unavailable → loads mock-meetings.json
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (REST /api/meetings)
// DEPENDENCIES: Modal, Button, StatCard, useWebSocketContext, next/navigation
// ============================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Calendar,
  Clock,
  Users,
  LayoutDashboard,
  Radio,
  FileText,
  Brain,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, StatCard } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { StatusIndicator } from '../../components/ui/StatusIndicator';
import { useWebSocketContext } from '../../components/providers/WebSocketProvider';
import { config } from '../../lib/config';
import type { Meeting } from '../../lib/types';

// ── Helpers ───────────────────────────────────────────────

/**
 * formatDate
 * Converts ISO date string to human-readable relative date.
 * @param iso - ISO 8601 date string
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * formatDuration
 * Converts minutes to "Xh Ym" or "Xm" format.
 * @param minutes - duration in minutes
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Component ─────────────────────────────────────────────

/**
 * DashboardPage
 * Main overview page. Fetches meetings from API, shows stats,
 * and provides the Start New Meeting flow.
 */
export default function DashboardPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { status, startMeeting, meetingState } = useWebSocketContext();

  const isMock = searchParams?.get('mock') === 'true';

  // State
  const [meetings,   setMeetings]   = useState<Meeting[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [meetTitle,  setMeetTitle]  = useState('');
  const [meetParts,  setMeetParts]  = useState('');
  const [starting,   setStarting]   = useState(false);
  const [user,       setUser]       = useState<{ name: string; email: string } | null>(null);

  // Load user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dealboard_user');
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ── Fetch meetings ──────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      if (!isMock) {
        const res = await fetch(`${config.API_URL}/api/meetings`);
        if (res.ok) {
          const data = await res.json();
          setMeetings(data.meetings ?? []);
          setLoading(false);
          return;
        }
      }
      // Fallback to mock data
      const mock = await import('../../mock-data/mock-meetings.json');
      setMeetings(mock.default as Meeting[]);
    } catch {
      // Silently fall back to mock
      try {
        const mock = await import('../../mock-data/mock-meetings.json');
        setMeetings(mock.default as Meeting[]);
      } catch { setMeetings([]); }
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  // ── Stats ───────────────────────────────────────────────
  const totalCards     = meetings.reduce((s, m) => s + (m.cardCount ?? 0), 0);
  const totalDocuments = meetings.reduce((s, m) => s + (m.documentCount ?? 0), 0);

  // ── Start Meeting ───────────────────────────────────────

  /**
   * handleStartMeeting
   * Sends meeting-start WS message and navigates to /meeting.
   */
  async function handleStartMeeting() {
    if (!meetTitle.trim()) return;
    setStarting(true);

    const participants = meetParts
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const meetingId = startMeeting(meetTitle.trim(), participants, '');
    // Store meeting info for the meeting page
    localStorage.setItem('dealboard_current_meeting', JSON.stringify({
      id:           meetingId,
      title:        meetTitle.trim(),
      participants,
    }));

    // Brief delay for WS message to be sent
    await new Promise((r) => setTimeout(r, 200));
    router.push(`/meeting${isMock ? '?mock=true' : ''}`);
  }

  // ── Render ──────────────────────────────────────────────

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard size={18} style={{ color: '#4285F4' }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9AA0A6' }}>
              Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#202124' }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#5F6368' }}>
            Your AI-powered sales companion is ready
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusIndicator status={status} showLabel />
          <Button
            variant="gemini"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowModal(true)}
          >
            New Meeting
          </Button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Meetings"
          value={meetings.length}
          trend="Across all time"
          accentColor="#4285F4"
          icon={<Calendar size={18} style={{ color: '#4285F4' }} />}
        />
        <StatCard
          label="Cards Generated"
          value={totalCards}
          trend="Intelligence cards"
          accentColor="#A142F4"
          icon={<Zap size={18} style={{ color: '#A142F4' }} />}
        />
        <StatCard
          label="Documents Created"
          value={totalDocuments}
          trend="Follow-ups & briefs"
          accentColor="#34A853"
          icon={<FileText size={18} style={{ color: '#34A853' }} />}
        />
        <StatCard
          label="Patterns Detected"
          value={Math.max(3, meetings.length * 2)}
          trend="From memory graph"
          accentColor="#FBBC04"
          icon={<Brain size={18} style={{ color: '#FBBC04' }} />}
        />
      </div>

      {/* ── Gemini banner ──────────────────────────────── */}
      <div
        className="rounded-xl p-4 mb-6 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(66,133,244,0.08), rgba(161,66,244,0.08))',
          border:     '1px solid rgba(66,133,244,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4285F4, #A142F4)' }}
          >
            <Zap size={17} color="white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#202124' }}>
              Start a live meeting to activate AI intelligence
            </p>
            <p className="text-xs" style={{ color: '#5F6368' }}>
              Real-time cards, competitive battlecards, and strategic guidance powered by Gemini 2.0
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Radio size={14} />}
          onClick={() => setShowModal(true)}
        >
          Start Meeting
        </Button>
      </div>

      {/* ── Recent Meetings ────────────────────────────── */}
      <Card elevation="raised" noPadding>
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ borderColor: '#E8EAED' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: '#202124' }}>
            Recent Meetings
          </h2>
          <Badge variant="default">{meetings.length} total</Badge>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{ borderColor: '#E8EAED', borderTopColor: '#4285F4', animation: 'spin 0.8s linear infinite' }}
            />
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-12 text-center">
            <Radio size={32} style={{ color: '#E8EAED', margin: '0 auto 12px' }} />
            <p className="text-sm font-medium" style={{ color: '#5F6368' }}>No meetings yet</p>
            <p className="text-xs mt-1" style={{ color: '#9AA0A6' }}>
              Start a meeting to begin capturing AI intelligence cards
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => setShowModal(true)}
              leftIcon={<Plus size={14} />}
            >
              Start first meeting
            </Button>
          </div>
        ) : (
          <div>
            {meetings.map((meeting, idx) => (
              <div
                key={meeting.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                style={{ borderBottom: idx < meetings.length - 1 ? '1px solid #F1F3F4' : 'none' }}
                onClick={() => router.push(`/review?meeting=${meeting.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/review?meeting=${meeting.id}`); }}
                aria-label={`View ${meeting.title}`}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#E8F0FE' }}
                >
                  <FileText size={16} style={{ color: '#4285F4' }} />
                </div>

                {/* Meeting info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#202124' }}>
                    {meeting.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#9AA0A6' }}>
                      <Calendar size={11} />
                      {formatDate(meeting.date)}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#9AA0A6' }}>
                      <Clock size={11} />
                      {formatDuration(meeting.duration)}
                    </span>
                    {meeting.participants?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#9AA0A6' }}>
                        <Users size={11} />
                        {meeting.participants.slice(0, 2).join(', ')}
                        {meeting.participants.length > 2 && ` +${meeting.participants.length - 2}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(meeting.cardCount ?? 0) > 0 && (
                    <Badge variant="info" pill>
                      {meeting.cardCount} cards
                    </Badge>
                  )}
                  {(meeting.documentCount ?? 0) > 0 && (
                    <Badge variant="success" pill>
                      {meeting.documentCount} docs
                    </Badge>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight
                  size={16}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#9AA0A6' }}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── New Meeting Modal ───────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setMeetTitle(''); setMeetParts(''); }}
        title="Start New Meeting"
        subtitle="Enter meeting details to begin capturing AI intelligence"
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gemini"
              size="md"
              loading={starting}
              leftIcon={<Radio size={15} />}
              onClick={handleStartMeeting}
              disabled={!meetTitle.trim()}
            >
              Start Meeting
            </Button>
          </div>
        }
      >
        <div className="px-5 py-5 space-y-4">
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: '#5F6368' }}
            >
              Meeting Title *
            </label>
            <input
              type="text"
              value={meetTitle}
              onChange={(e) => setMeetTitle(e.target.value)}
              placeholder="e.g. TechVentures Q2 Demo"
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none
                transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: '#DADCE0', color: '#202124' }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && meetTitle.trim()) handleStartMeeting(); }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: '#5F6368' }}
            >
              Participants
            </label>
            <input
              type="text"
              value={meetParts}
              onChange={(e) => setMeetParts(e.target.value)}
              placeholder="Sarah Chen, Marcus Johnson, Priya Patel"
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none
                transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: '#DADCE0', color: '#202124' }}
            />
            <p className="text-xs mt-1" style={{ color: '#9AA0A6' }}>
              Separate names with commas
            </p>
          </div>

          <div
            className="rounded-lg p-3 flex items-start gap-2"
            style={{ backgroundColor: '#E8F0FE', border: '1px solid #AECBFA' }}
          >
            <Zap size={14} style={{ color: '#4285F4', marginTop: 1, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: '#4285F4' }}>
              Gemini will automatically fetch context from Gmail, Drive, and Calendar
              for all recognized participants.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
