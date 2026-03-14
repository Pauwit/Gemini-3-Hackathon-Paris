'use client';

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function ScanStatus({ lastScanTime, scanning, onRefresh }: {
  lastScanTime: string | null; scanning: boolean; onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {lastScanTime && (
        <span className="text-[12px] text-ink-4">{ago(lastScanTime)}</span>
      )}
      <button
        onClick={onRefresh}
        disabled={scanning}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-ink-3 bg-white border border-line transition-all hover:border-brand-blue hover:text-brand-blue disabled:opacity-50"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
      >
        <svg className={scanning ? 'spin' : ''} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M1 4v6h6M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
        </svg>
        {scanning ? 'Scanning…' : 'Refresh'}
      </button>
    </div>
  );
}
