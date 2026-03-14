// ============================================================
// app/settings/page.tsx — Settings & Configuration Page
// ============================================================
//
// PURPOSE:
// Configuration dashboard for DealBoard. Allows users to:
//   - View WebSocket connection status and server health
//   - See active feature flags (vision, memory, strategyAgent)
//   - Configure API URL / WS URL (stored in localStorage)
//   - Toggle mock mode
//   - View system info (version, build, uptime)
//   - Sign out (clears localStorage auth)
//
// DATA FLOW:
//   useWebSocketContext → status, features
//   GET /api/health     → server version, mode, timestamp
//   localStorage        → config overrides
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/health)
// DEPENDENCIES: useWebSocketContext, StatusIndicator, config
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter }            from 'next/navigation';
import { Settings, Server, Zap, Eye, Brain, Shield, LogOut, RefreshCw, Check } from 'lucide-react';
import { useWebSocketContext }  from '../../components/providers/WebSocketProvider';
import { StatusIndicator }      from '../../components/ui/StatusIndicator';
import { Button }               from '../../components/ui/Button';
import { Card }                 from '../../components/ui/Card';
import { Badge }                from '../../components/ui/Badge';
import { config }               from '../../lib/config';

// ── Types ─────────────────────────────────────────────────

interface HealthData {
  version:   string;
  mode:      string;
  timestamp: string;
  features: { vision: boolean; memory: boolean; strategyAgent: boolean };
}

// ── Section component ─────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card elevation="raised" className="mb-4">
      <h2 className="text-sm font-semibold mb-4" style={{ color: '#202124' }}>{title}</h2>
      {children}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F8F9FA' }}>
      <span className="text-sm" style={{ color: '#5F6368' }}>{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="w-8 h-4 rounded-full relative transition-colors"
      style={{ backgroundColor: on ? '#34A853' : '#DADCE0' }}
    >
      <div
        className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
        style={{ left: on ? '50%' : '2px', transform: on ? 'translateX(2px)' : 'none' }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

/**
 * SettingsPage
 * Configuration and status page for DealBoard.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { status, features } = useWebSocketContext();

  const [health,      setHealth]      = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [user,        setUser]        = useState<{ name: string; email: string } | null>(null);
  const [apiUrl,      setApiUrl]      = useState(config.API_URL);
  const [wsUrl,       setWsUrl]       = useState(config.WS_URL);
  const [saved,       setSaved]       = useState(false);
  const [mockMode,    setMockMode]    = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dealboard_user');
      if (raw) setUser(JSON.parse(raw));
      const mock = new URLSearchParams(window.location.search).get('mock');
      setMockMode(mock === 'true');
    } catch { /* ignore */ }
  }, []);

  /** Fetch /api/health to show server status */
  async function fetchHealth() {
    setHealthLoading(true);
    try {
      const res = await fetch(`${config.API_URL}/api/health`);
      if (res.ok) setHealth(await res.json());
    } catch { setHealth(null); }
    finally { setHealthLoading(false); }
  }

  useEffect(() => { fetchHealth(); }, []);

  /** Save URL overrides to localStorage */
  function handleSaveUrls() {
    localStorage.setItem('dealboard_api_url', apiUrl);
    localStorage.setItem('dealboard_ws_url',  wsUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  /** Sign out */
  function handleSignOut() {
    localStorage.removeItem('dealboard_auth');
    localStorage.removeItem('dealboard_user');
    router.push('/auth');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-1">
        <Settings size={18} style={{ color: '#5F6368' }} />
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9AA0A6' }}>
          Settings
        </span>
      </div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#202124' }}>Configuration</h1>

      {/* ── Connection Status ──────────────────────────── */}
      <Section title="Server Connection">
        <Row label="WebSocket Status">
          <StatusIndicator status={status} showLabel />
        </Row>
        <Row label="API URL">
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#F8F9FA', color: '#5F6368' }}>
            {config.API_URL}
          </span>
        </Row>
        {health && (
          <>
            <Row label="Server Version">
              <Badge variant="info">{health.version}</Badge>
            </Row>
            <Row label="Server Mode">
              <Badge variant={health.mode === 'mock' ? 'warning' : 'success'}>{health.mode}</Badge>
            </Row>
            <Row label="Last Health Check">
              <span className="text-xs" style={{ color: '#9AA0A6' }}>
                {new Date(health.timestamp).toLocaleTimeString()}
              </span>
            </Row>
          </>
        )}
        <div className="pt-3">
          <Button
            variant="secondary"
            size="sm"
            loading={healthLoading}
            leftIcon={<RefreshCw size={13} />}
            onClick={fetchHealth}
          >
            Check Connection
          </Button>
        </div>
      </Section>

      {/* ── Feature Flags ─────────────────────────────── */}
      <Section title="Features">
        <Row label="Vision (emotion detection)">
          <div className="flex items-center gap-2">
            <Eye size={14} style={{ color: features?.vision ? '#34A853' : '#9AA0A6' }} />
            <Toggle on={features?.vision ?? config.ENABLE_VISION} />
          </div>
        </Row>
        <Row label="Memory Graph">
          <div className="flex items-center gap-2">
            <Brain size={14} style={{ color: features?.memory ? '#34A853' : '#9AA0A6' }} />
            <Toggle on={features?.memory ?? config.ENABLE_MEMORY_VIEW} />
          </div>
        </Row>
        <Row label="Strategy Agent">
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: features?.strategyAgent ? '#34A853' : '#9AA0A6' }} />
            <Toggle on={features?.strategyAgent ?? true} />
          </div>
        </Row>
        <Row label="Mock Mode">
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: mockMode ? '#FBBC04' : '#9AA0A6' }} />
            <Toggle on={mockMode} />
          </div>
        </Row>
        <p className="text-xs mt-2" style={{ color: '#9AA0A6' }}>
          Feature flags are read from the server. Add ?mock=true to any URL for demo mode.
        </p>
      </Section>

      {/* ── URL Configuration ─────────────────────────── */}
      <Section title="URL Configuration">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9AA0A6' }}>
              API URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: '#DADCE0', color: '#202124' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9AA0A6' }}>
              WebSocket URL
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: '#DADCE0', color: '#202124' }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={saved ? <Check size={13} /> : undefined}
            onClick={handleSaveUrls}
          >
            {saved ? 'Saved!' : 'Save URLs'}
          </Button>
          <p className="text-xs" style={{ color: '#9AA0A6' }}>
            URL overrides are stored in localStorage and applied on next page load.
          </p>
        </div>
      </Section>

      {/* ── Account ───────────────────────────────────── */}
      <Section title="Account">
        {user && (
          <Row label={user.name}>
            <span className="text-xs" style={{ color: '#9AA0A6' }}>{user.email}</span>
          </Row>
        )}
        <div className="pt-3">
          <Button
            variant="danger"
            size="sm"
            leftIcon={<LogOut size={13} />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Section>

      {/* ── About ─────────────────────────────────────── */}
      <Card elevation="flat">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4285F4, #A142F4)' }}
          >
            <Zap size={14} color="white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#202124' }}>DealBoard AI Companion</span>
        </div>
        <div className="space-y-1">
          <p className="text-xs" style={{ color: '#5F6368' }}>Version: 1.0.0-hackathon</p>
          <p className="text-xs" style={{ color: '#5F6368' }}>Powered by Gemini 3.1 Flash</p>
          <p className="text-xs" style={{ color: '#9AA0A6' }}>Built for Gemini 3 Hackathon Paris — March 2025</p>
        </div>
      </Card>
    </div>
  );
}
