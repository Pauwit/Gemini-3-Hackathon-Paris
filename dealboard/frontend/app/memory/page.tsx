// ============================================================
// app/memory/page.tsx — Knowledge Memory Explorer
// ============================================================
//
// PURPOSE:
// Persistent memory explorer showing accumulated intelligence
// from all past meetings. Four tab views:
//   1. Graph     — D3 force-directed knowledge graph
//   2. People    — Profile cards for known contacts
//   3. Patterns  — Behavioral patterns with confidence bars
//   4. Decisions — Timeline of all decisions across meetings
//
// DATA FLOW:
//   GET /api/memory/graph     → KnowledgeGraph
//   GET /api/memory/people    → PeopleProfiles
//   GET /api/memory/patterns  → PatternInsights
//   GET /api/memory/decisions → DecisionHistory
//   Mock fallback → mock-memory-graph.json + mock-memory.json
//
// MOCK MODE: ?mock=true or backend unavailable loads JSON mocks.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (memory endpoints)
// DEPENDENCIES: KnowledgeGraph, PeopleProfiles, PatternInsights,
//               DecisionHistory, config
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams }  from 'next/navigation';
import { Brain, Network, Users, TrendingUp, CheckSquare, RefreshCw } from 'lucide-react';
import { KnowledgeGraph }   from './components/KnowledgeGraph';
import { PeopleProfiles }   from './components/PeopleProfiles';
import { PatternInsights }  from './components/PatternInsights';
import { DecisionHistory }  from './components/DecisionHistory';
import { Button }           from '../../components/ui/Button';
import { Badge }            from '../../components/ui/Badge';
import { config }           from '../../lib/config';
import type {
  GraphNode, GraphEdge, GraphStats,
  Person, Pattern, Decision,
} from '../../lib/types';

// ── Tab config ────────────────────────────────────────────

type Tab = 'graph' | 'people' | 'patterns' | 'decisions';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'graph',     label: 'Knowledge Graph', icon: Network    },
  { key: 'people',    label: 'People',          icon: Users      },
  { key: 'patterns',  label: 'Patterns',        icon: TrendingUp },
  { key: 'decisions', label: 'Decisions',       icon: CheckSquare },
];

// ── Mock memory data (people, patterns, decisions) ────────

interface MemoryData {
  people:    Person[];
  patterns:  Pattern[];
  decisions: Decision[];
}

const MOCK_MEMORY_DATA: MemoryData = {
  people: [
    {
      id:            'person-sarah-chen',
      name:          'Sarah Chen',
      role:          'Account Executive',
      company:       'AcmeCorp',
      decisionMaker: false,
      preferences:   ['efficiency', 'data-driven demos'],
      concerns:      [],
      lastSeen:      '2024-01-15T11:00:00Z',
      relationship:  'Internal seller',
    },
    {
      id:            'person-marcus-johnson',
      name:          'Marcus Johnson',
      role:          'CTO',
      company:       'TechVentures',
      decisionMaker: true,
      preferences:   ['cost savings', 'ROI clarity', 'migration simplicity'],
      concerns:      ['budget approval', 'migration risk'],
      lastSeen:      '2024-01-15T11:00:00Z',
      relationship:  'Financial champion — needs CFO sign-off for deals >$300k',
    },
    {
      id:            'person-priya-patel',
      name:          'Priya Patel',
      role:          'VP Engineering',
      company:       'TechVentures',
      decisionMaker: true,
      preferences:   ['kubernetes-native', 'prometheus compatibility', 'migration tooling'],
      concerns:      ['alert fatigue', 'dashboard migration effort'],
      lastSeen:      '2024-01-15T11:00:00Z',
      relationship:  'Technical veto — must sign off before Marcus commits',
    },
  ],
  patterns: [
    {
      id:             'pat-001',
      type:           'pricing_concern',
      description:    'TechVentures consistently raises budget concerns in the first 10 minutes of each meeting. CFO pressure is the underlying driver.',
      evidence:       ['meeting-oct-2023', 'meeting-nov-2023', 'meeting-001'],
      confidence:     0.92,
      recommendation: 'Lead with 3-year TCO comparison before any pricing discussion to frame value first.',
    },
    {
      id:             'pat-002',
      type:           'migration_risk',
      description:    'Both CTO and VP Engineering consistently raise migration risk. Previous vendor migration caused production incidents.',
      evidence:       ['meeting-nov-2023', 'meeting-001'],
      confidence:     0.88,
      recommendation: 'Proactively present phased migration plan with dedicated engineer assignment in next meeting.',
    },
    {
      id:             'pat-003',
      type:           'compliance_block',
      description:    'SOC 2 Type II and GDPR DPA are non-negotiable blockers — legal team will not approve without them.',
      evidence:       ['meeting-001'],
      confidence:     0.97,
      recommendation: 'Send compliance pack immediately. Offer reference call with DataCorp in Frankfurt.',
    },
  ],
  decisions: [
    {
      id:        'dec-001',
      date:      '2024-01-15T10:15:00Z',
      meetingId: 'meeting-001',
      description: 'Sarah Chen to send SOC 2 Type II report and GDPR DPA template to TechVentures legal by Jan 19',
      madeBy:    'Sarah Chen',
      status:    'pending',
    },
    {
      id:        'dec-002',
      date:      '2024-01-15T10:26:00Z',
      meetingId: 'meeting-001',
      description: 'Schedule Kubernetes integration deep-dive with Priya Patel — target January 29',
      madeBy:    'Sarah Chen',
      status:    'pending',
    },
    {
      id:        'dec-003',
      date:      '2024-01-15T10:30:00Z',
      meetingId: 'meeting-001',
      description: 'Prepare phased migration proposal: non-prod → secondary prod → critical path (10 weeks)',
      madeBy:    'Sarah Chen',
      status:    'pending',
    },
    {
      id:        'dec-004',
      date:      '2023-11-20T11:30:00Z',
      meetingId: 'meeting-nov-2023',
      description: 'Proposal sent at $28k/month — await TechVentures internal review',
      madeBy:    'Sarah Chen',
      status:    'completed',
    },
  ],
};

// ── Component ─────────────────────────────────────────────

/**
 * MemoryPage
 * Tabbed memory explorer. Fetches all memory data on mount,
 * falls back to mock data when backend is unavailable.
 */
export default function MemoryPage() {
  const searchParams = useSearchParams();
  const isMock       = searchParams?.get('mock') === 'true';

  const [activeTab,  setActiveTab]  = useState<Tab>('graph');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nodes,      setNodes]      = useState<GraphNode[]>([]);
  const [edges,      setEdges]      = useState<GraphEdge[]>([]);
  const [stats,      setStats]      = useState<GraphStats | null>(null);
  const [memData,    setMemData]    = useState<MemoryData>(MOCK_MEMORY_DATA);

  async function loadData() {
    try {
      if (!isMock) {
        // Try graph endpoint
        const gr = await fetch(`${config.API_URL}/api/memory/graph`);
        if (gr.ok) {
          const gd = await gr.json();
          setNodes(gd.nodes ?? []);
          setEdges(gd.edges ?? []);
          setStats(gd.stats ?? null);
        }
        // Try people/patterns/decisions
        const [pr, patr, decr] = await Promise.allSettled([
          fetch(`${config.API_URL}/api/memory/people`).then((r) => r.json()),
          fetch(`${config.API_URL}/api/memory/patterns`).then((r) => r.json()),
          fetch(`${config.API_URL}/api/memory/decisions`).then((r) => r.json()),
        ]);
        setMemData({
          people:    pr.status    === 'fulfilled' ? pr.value.people    ?? [] : MOCK_MEMORY_DATA.people,
          patterns:  patr.status  === 'fulfilled' ? patr.value.patterns ?? [] : MOCK_MEMORY_DATA.patterns,
          decisions: decr.status  === 'fulfilled' ? decr.value.decisions ?? [] : MOCK_MEMORY_DATA.decisions,
        });
        return;
      }
    } catch { /* fall through to mock */ }

    // Mock fallback
    try {
      const mg = await import('../../mock-data/mock-memory-graph.json');
      setNodes(mg.default.nodes as GraphNode[]);
      setEdges(mg.default.edges as GraphEdge[]);
      setStats(mg.default.stats as GraphStats);
    } catch { /* ignore */ }
    setMemData(MOCK_MEMORY_DATA);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMock]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={18} style={{ color: '#A142F4' }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9AA0A6' }}>
              Memory
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#202124' }}>
            Knowledge Memory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#5F6368' }}>
            Accumulated intelligence from {stats?.totalMeetings ?? memData.decisions.length} meeting{(stats?.totalMeetings ?? 1) !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant="info">{stats.totalNodes} nodes</Badge>
              <Badge variant="default">{stats.totalEdges} edges</Badge>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            leftIcon={<RefreshCw size={13} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────── */}
      <div
        className="flex gap-0 mb-6 rounded-xl overflow-hidden"
        style={{ border: '1px solid #E8EAED', backgroundColor: '#FFFFFF' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.key ? '#E8F0FE' : 'transparent',
                color:           activeTab === tab.key ? '#4285F4' : '#5F6368',
                borderRight:     '1px solid #E8EAED',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ───────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex gap-1.5">
            {[0,1,2].map((i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: '#A142F4',
                  animation: `geminiDot 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'graph'     && <KnowledgeGraph  nodes={nodes}  edges={edges} />}
          {activeTab === 'people'    && <PeopleProfiles  people={memData.people} />}
          {activeTab === 'patterns'  && <PatternInsights patterns={memData.patterns} />}
          {activeTab === 'decisions' && <DecisionHistory decisions={memData.decisions} />}
        </>
      )}
    </div>
  );
}
