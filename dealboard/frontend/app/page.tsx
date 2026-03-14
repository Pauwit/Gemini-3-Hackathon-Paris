'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStatus()
      .then(s => s?.data?.google?.connected ? router.replace('/dashboard') : setChecking(false))
      .catch(() => setChecking(false));
    if (new URLSearchParams(window.location.search).get('error') === 'auth_failed')
      setError('Sign-in failed. Please try again.');
  }, [router]);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1E1B4B,#312E81,#4C1D95)' }}>
      <div className="flex gap-1.5">
        <span className="dot" style={{ background: 'rgba(255,255,255,0.8)' }}/>
        <span className="dot" style={{ background: 'rgba(196,181,253,0.8)' }}/>
        <span className="dot" style={{ background: 'rgba(255,255,255,0.8)' }}/>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#1E1B4B 0%,#312E81 40%,#4C1D95 100%)' }}>

      {/* Left: branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 flex-1 text-white">
        <div className="max-w-md">
          <div className="text-5xl mb-6">✦</div>
          <h1 className="text-[42px] font-extrabold leading-tight tracking-tight mb-4">
            Your workspace,<br/>
            <span style={{ color: '#C4B5FD' }}>intelligently</span> organized.
          </h1>
          <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(196,181,253,0.8)' }}>
            AI Companion reads your Gmail, Drive and Calendar to surface what matters — advice, context, and people briefings, all in one place.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            {['📧 Understands your emails', '📁 Reads your documents', '📅 Knows your schedule', '🎯 Gives strategic advice'].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-[14px] font-medium" style={{ color: 'rgba(221,214,254,0.9)' }}>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: login card */}
      <div className="flex items-center justify-center w-full lg:w-[480px] lg:flex-shrink-0 p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-pop flex flex-col gap-6">

          <div className="text-center">
            <div className="text-4xl mb-3">✦</div>
            <h2 className="text-[22px] font-extrabold text-ink tracking-tight">Welcome back</h2>
            <p className="text-[13px] text-muted mt-1.5">Sign in to access your workspace intelligence</p>
          </div>

          {error && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center font-medium">
              {error}
            </div>
          )}

          <a
            href={`${BACKEND}/auth/google`}
            className="flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl text-[14px] font-semibold text-ink bg-white border-2 border-border transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#6366F1';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
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
            We access Gmail, Drive & Calendar to generate<br/>your personalized workspace insights.
          </p>
        </div>
      </div>

    </div>
  );
}
