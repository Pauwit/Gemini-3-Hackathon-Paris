'use client';

export type Page = 'dashboard' | 'chat' | 'settings';

const ITEMS: { id: Page; label: string; emoji: string }[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '✦' },
  { id: 'chat',      label: 'Chat',      emoji: '💬' },
  { id: 'settings',  label: 'Settings',  emoji: '⚙️' },
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
      className="flex flex-col flex-shrink-0 py-6 px-4"
      style={{
        width: 220,
        minHeight: 0,
        background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 60%, #4C1D95 100%)',
      }}
    >
      {/* Logo */}
      <div className="px-2 mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <span style={{ fontSize: 22 }}>✦</span>
          <span className="text-white font-bold text-[16px] tracking-tight">AI Companion</span>
        </div>
        <p className="text-[11px] pl-8" style={{ color: 'rgba(196,181,253,0.7)' }}>Powered by Gemini</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {ITEMS.map(({ id, label, emoji }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-left w-full transition-all duration-150"
              style={{
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#FFFFFF' : 'rgba(196,181,253,0.8)',
                boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>{emoji}</span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {lastScanTime && (
          <p className="text-[11px] px-3 mb-2" style={{ color: 'rgba(196,181,253,0.5)' }}>
            Updated {new Date(lastScanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium w-full transition-all disabled:opacity-40"
            style={{ color: 'rgba(196,181,253,0.7)', background: 'rgba(255,255,255,0.05)' }}
          >
            <span className={scanning ? 'spin inline-block' : 'inline-block'}>↻</span>
            {scanning ? 'Scanning…' : 'Refresh'}
          </button>
        )}
      </div>
    </aside>
  );
}
