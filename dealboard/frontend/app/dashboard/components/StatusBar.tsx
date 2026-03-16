'use client';

import { UserStatus } from '@/lib/types';

export default function StatusBar({ status, onLogout }: { status: UserStatus | null; onLogout: () => void }) {
  const ok = status?.gemini?.connected;
  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        height: 56,
        background: '#0D0D11',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <p className="text-[13px] font-medium text-subtle">
        {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <div className="flex items-center gap-4">
        <span
          className="text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
          style={ok
            ? { background: 'rgba(52,168,83,0.12)', color: '#81C995', border: '1px solid rgba(52,168,83,0.25)' }
            : { background: 'rgba(251,188,5,0.10)', color: '#FDD663', border: '1px solid rgba(251,188,5,0.22)' }
          }
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? '#52C77F' : '#FDD663' }}/>
          {ok ? 'Gemini ready' : 'Gemini not set'}
        </span>
        {status?.google?.connected && (
          <div className="flex items-center gap-2.5">
            {status.google.avatar
              ? <img src={status.google.avatar} alt="" className="w-8 h-8 rounded-full" style={{ boxShadow: '0 0 0 2px rgba(66,133,244,0.4)' }} referrerPolicy="no-referrer"/>
              : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#4285F4,#9334E6)' }}>
                  {status.google.name?.[0] || 'U'}
                </div>
              )
            }
            <button
              onClick={onLogout}
              className="text-[12px] text-subtle font-medium transition-colors cursor-pointer"
              onMouseEnter={e => { e.currentTarget.style.color = '#E8EAED'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5F6368'; }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
