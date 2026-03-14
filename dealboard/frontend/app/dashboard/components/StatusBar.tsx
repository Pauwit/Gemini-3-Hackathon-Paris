'use client';

import { UserStatus } from '@/lib/types';

export default function StatusBar({ status, onLogout }: { status: UserStatus | null; onLogout: () => void }) {
  const ok = status?.gemini?.connected;
  return (
    <header className="flex items-center justify-between px-6 bg-white border-b border-border" style={{ height: 56 }}>
      <p className="text-[13px] font-medium text-muted">
        {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <div className="flex items-center gap-4">
        <span
          className="text-[12px] font-medium px-3 py-1 rounded-full"
          style={ok
            ? { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }
            : { background: '#FEF9C3', color: '#A16207', border: '1px solid #FDE68A' }
          }
        >
          {ok ? '● Gemini ready' : '○ Gemini not set'}
        </span>
        {status?.google?.connected && (
          <div className="flex items-center gap-2.5">
            {status.google.avatar
              ? <img src={status.google.avatar} alt="" className="w-8 h-8 rounded-full ring-2 ring-border" referrerPolicy="no-referrer"/>
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>{status.google.name?.[0] || 'U'}</div>
            }
            <button onClick={onLogout} className="text-[12px] text-subtle hover:text-muted transition-colors font-medium">Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
