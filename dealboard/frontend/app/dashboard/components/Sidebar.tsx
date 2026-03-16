'use client';

export type Page = 'dashboard' | 'chat' | 'visio' | 'settings';

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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

const ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'chat',      label: 'Chat',      icon: <ChatIcon /> },
  { id: 'visio',     label: 'Visio',     icon: <VideoIcon /> },
  { id: 'settings',  label: 'Settings',  icon: <SettingsIcon /> },
];

interface Props {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  lastScanTime?: string | null;
  onRefresh?: () => void;
  scanning?: boolean;
}

export default function Sidebar({ currentPage, onNavigate, lastScanTime, onRefresh, scanning }: Props) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 py-5 px-3"
      style={{
        width: 220,
        minHeight: 0,
        background: '#0D0D11',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="grad-text gem-glow" style={{ fontSize: 22, lineHeight: 1 }}>✦</span>
          <span className="text-ink font-bold text-[15px] tracking-tight">AI Companion</span>
        </div>
        <p className="text-[11px] pl-8 text-subtle">Powered by Gemini</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {ITEMS.map(({ id, label, icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left w-full transition-all duration-150 cursor-pointer"
              style={{
                background: active ? 'rgba(66,133,244,0.15)' : 'transparent',
                color: active ? '#8AB4F8' : 'rgba(154,160,166,0.85)',
                border: active ? '1px solid rgba(66,133,244,0.25)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#E8EAED';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(154,160,166,0.85)';
                }
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {lastScanTime && (
          <p className="text-[11px] px-3 mb-2 text-subtle">
            Updated {new Date(lastScanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium w-full transition-all disabled:opacity-40 cursor-pointer"
            style={{ color: 'rgba(154,160,166,0.7)', background: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <span className={scanning ? 'spin inline-block' : 'inline-block'}><RefreshIcon /></span>
            {scanning ? 'Scanning…' : 'Refresh'}
          </button>
        )}
      </div>
    </aside>
  );
}
