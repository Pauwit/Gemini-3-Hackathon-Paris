'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const FEATURES = [
  { icon: <EmailIcon />, label: 'Understands your emails' },
  { icon: <DocIcon />,   label: 'Reads your documents' },
  { icon: <CalIcon />,   label: 'Knows your schedule' },
  { icon: <BulbIcon />,  label: 'Gives strategic advice' },
];

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function BulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.getStatus()
      .then(s => s?.data?.google?.connected ? router.replace('/dashboard') : setChecking(false))
      .catch(() => setChecking(false));
    if (new URLSearchParams(window.location.search).get('error') === 'auth_failed')
      setError('Sign-in failed. Please try again.');
  }, [router]);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex gap-1.5">
        <span className="dot" style={{ background: '#4285F4' }}/>
        <span className="dot" style={{ background: '#9334E6' }}/>
        <span className="dot" style={{ background: '#E8437B' }}/>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-canvas relative overflow-hidden">

      {/* Background mesh glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div style={{ position:'absolute', top:'-20%', right:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(66,133,244,0.10) 0%, transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:'-15%', left:'-5%',  width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(147,52,230,0.10) 0%, transparent 70%)' }}/>
        <div style={{ position:'absolute', top:'40%',   left:'30%',   width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,67,123,0.06) 0%, transparent 70%)' }}/>
      </div>

      {/* Left: branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 flex-1 relative z-10">
        <div className="max-w-md">
          {/* Sparkle logo */}
          <div className="mb-8 flex items-center gap-3">
            <span className="grad-text gem-glow" style={{ fontSize: 36, lineHeight: 1 }}>✦</span>
            <span className="text-ink font-bold text-[18px] tracking-tight">AI Companion</span>
          </div>

          <h1 className="text-[44px] font-bold leading-tight tracking-tight mb-4 text-ink">
            Your workspace,<br/>
            <span className="grad-text">intelligently</span> organized.
          </h1>
          <p className="text-[16px] leading-relaxed text-muted">
            AI Companion reads your Gmail, Drive and Calendar to surface what matters — advice, context, and people briefings, all in one place.
          </p>

          <div className="flex flex-col gap-3 mt-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-[14px] font-medium" style={{ color: 'rgba(232,234,237,0.75)' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: '#8AB4F8' }}>
                  {f.icon}
                </span>
                {f.label}
              </div>
            ))}
          </div>

          <p className="text-[12px] text-subtle mt-10">Powered by Gemini · Google Workspace</p>
        </div>
      </div>

      {/* Right: login card */}
      <div className="flex items-center justify-center w-full lg:w-[480px] lg:flex-shrink-0 p-6 relative z-10">
        <div
          className="w-full max-w-sm rounded-3xl p-8 flex flex-col gap-6"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Card header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <span className="grad-text gem-glow" style={{ fontSize: 40, lineHeight: 1 }}>✦</span>
            </div>
            <h2 className="text-[22px] font-bold text-ink tracking-tight">Welcome back</h2>
            <p className="text-[13px] text-muted mt-1.5">Sign in to access your workspace intelligence</p>
          </div>

          {error && (
            <div className="text-[13px] rounded-xl px-4 py-3 text-center font-medium" style={{ background: 'rgba(234,67,53,0.12)', color: '#FF8A80', border: '1px solid rgba(234,67,53,0.25)' }}>
              {error}
            </div>
          )}

          {/* Google sign-in button */}
          <a
            href={`${BACKEND}/auth/google`}
            className="flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl text-[14px] font-semibold text-ink transition-all duration-200 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#E8EAED',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.borderColor = 'rgba(66,133,244,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66,133,244,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.131 17.64 11.823 17.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          <p className="text-[12px] text-subtle text-center">
            We access Gmail, Drive &amp; Calendar to generate<br/>your personalized workspace insights.
          </p>
        </div>
      </div>

    </div>
  );
}
