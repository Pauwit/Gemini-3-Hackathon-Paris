// ============================================================
// app/auth/page.tsx — Google Sign-In Page
// ============================================================
//
// PURPOSE:
// Beautiful Google-style sign-in page for DealBoard.
// Shows the Gemini gradient branding, product description,
// and a "Sign in with Google" button.
//
// AUTH FLOW (simulated for hackathon):
// 1. User clicks "Sign in with Google"
// 2. Sets localStorage key 'dealboard_auth' = 'true'
// 3. Redirects to /dashboard
//
// In a production deployment, step 2 would be replaced with
// an OAuth 2.0 flow via next-auth or Google Identity Services.
//
// DESIGN:
// Two-column layout on desktop:
//   Left:  DealBoard branding + feature list
//   Right: Sign-in card
// Single column on mobile with sign-in card first.
//
// DEPENDENCIES: next/navigation (useRouter), lucide-react
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Shield,
  Radio,
  Brain,
  FileText,
  CheckCircle,
} from 'lucide-react';

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// ── Feature list shown on the left column ────────────────

const FEATURES = [
  {
    icon:  Radio,
    title: 'Real-time Intelligence',
    desc:  'AI cards surface ALERT, STRATEGY, and CONTEXT during your call',
    color: '#4285F4',
  },
  {
    icon:  Brain,
    title: 'Persistent Memory',
    desc:  'Remembers every prospect, decision, and pattern across meetings',
    color: '#A142F4',
  },
  {
    icon:  FileText,
    title: 'Auto-Generated Docs',
    desc:  'Follow-up emails, strategy briefs and decision logs in one click',
    color: '#34A853',
  },
  {
    icon:  Shield,
    title: 'Google Workspace Aware',
    desc:  'Enriches calls with Gmail, Drive, Calendar and Sheets context',
    color: '#FBBC04',
  },
];

// ── Component ─────────────────────────────────────────────

/**
 * AuthPage
 * Full-screen sign-in page. Simulates Google OAuth by setting
 * localStorage and redirecting to dashboard.
 */
export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  function decodeJwtPayload(token: string) {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  }

  function finishSignIn(user: { name: string; email: string; avatar: string | null }) {
    localStorage.setItem('dealboard_auth', 'true');
    localStorage.setItem('dealboard_user', JSON.stringify(user));
    router.push('/dashboard');
  }

  function handleGoogleCredential(response: GoogleCredentialResponse) {
    try {
      if (!response.credential) {
        throw new Error('No Google credential returned');
      }

      const payload = decodeJwtPayload(response.credential);
      if (!payload?.email) {
        throw new Error('Google sign-in did not return a valid profile');
      }

      finishSignIn({
        name: payload.name || payload.email,
        email: payload.email,
        avatar: payload.picture || null,
      });
    } catch {
      setLoading(false);
      setAuthError('Google sign-in failed. Please try again.');
    }
  }

  // If already authenticated, skip to dashboard
  useEffect(() => {
    const auth = localStorage.getItem('dealboard_auth');
    if (auth === 'true') {
      router.replace('/dashboard');
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    if (!googleClientId) {
      setAuthError('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend .env.local');
      return;
    }

    const scriptId = 'google-identity-services';
    const existingScript = document.getElementById(scriptId);

    const initialize = () => {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
    };

    if (existingScript) {
      initialize();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () => setAuthError('Unable to load Google sign-in SDK.');
    document.head.appendChild(script);
  }, [googleClientId]);

  /**
   * handleSignIn
   * Starts Google Identity Services sign-in.
   */
  async function handleSignIn() {
    setAuthError(null);

    if (!googleClientId) {
      setAuthError('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend .env.local');
      return;
    }

    if (!window.google?.accounts?.id) {
      setAuthError('Google sign-in is still loading. Please try again in a second.');
      return;
    }

    setLoading(true);
    window.google.accounts.id.prompt();
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-[3px]"
          style={{
            borderColor: '#E8EAED',
            borderTopColor: '#4285F4',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: Branding ──────────────────────────────── */}
      <div
        className="lg:flex-1 flex flex-col justify-center px-8 py-12 lg:px-16"
        style={{
          background: 'linear-gradient(135deg, #4285F4 0%, #7B61F8 50%, #A142F4 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Zap size={22} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-white font-bold text-xl block leading-none">DealBoard</span>
            <span className="text-white/70 text-xs">AI Sales Companion</span>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h1 className="text-white font-bold text-3xl lg:text-4xl leading-tight mb-4">
            Your AI co-pilot<br />for every sales call
          </h1>
          <p className="text-white/80 text-base max-w-md">
            Real-time intelligence cards, competitive battlecards, and
            strategic guidance — powered by Gemini 3.1.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4 max-w-sm">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <Icon size={16} color="white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/70 text-xs">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom attribution */}
        <p className="text-white/50 text-xs mt-12">
          Built with Gemini 3.1 · Google Workspace APIs · Paris Hackathon 2025
        </p>
      </div>

      {/* ── Right: Sign-in card ──────────────────────────── */}
      <div className="lg:w-[480px] flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Card header */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #4285F4, #A142F4)' }}
            >
              <Zap size={26} color="white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#202124' }}>
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: '#5F6368' }}>
              Sign in to your DealBoard workspace
            </p>
          </div>

          {/* Google Sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border
              transition-all duration-150 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed
              font-medium text-sm"
            style={{
              borderColor: '#DADCE0',
              color:       '#202124',
              boxShadow:   '0 1px 2px rgba(60,64,67,0.3), 0 2px 6px rgba(60,64,67,0.15)',
            }}
          >
            {loading ? (
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  borderColor:    '#E8EAED',
                  borderTopColor: '#4285F4',
                  animation:      'spin 0.8s linear infinite',
                }}
              />
            ) : (
              // Google 'G' logo SVG
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>

          {authError && (
            <p className="text-xs mt-3 text-center" style={{ color: '#EA4335' }}>
              {authError}
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E8EAED' }} />
            <span className="text-xs" style={{ color: '#9AA0A6' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E8EAED' }} />
          </div>

          {/* Demo mode button */}
          <button
            onClick={() => finishSignIn({
              name: 'Demo User',
              email: 'demo@dealboard.local',
              avatar: null,
            })}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border
              transition-all duration-150 text-sm font-medium
              disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderColor:     '#AECBFA',
              color:           '#4285F4',
              backgroundColor: '#E8F0FE',
            }}
          >
            <CheckCircle size={15} />
            Continue with demo workspace
          </button>

          {/* Fine print */}
          <p className="text-center text-xs mt-6" style={{ color: '#9AA0A6' }}>
            By signing in, you agree to the DealBoard Terms of Service
            and Privacy Policy.
          </p>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {['SOC 2', 'GDPR', 'Google Cloud'].map((badge) => (
              <span
                key={badge}
                className="text-[10px] px-2 py-1 rounded border font-medium"
                style={{ color: '#5F6368', borderColor: '#DADCE0', backgroundColor: '#F8F9FA' }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
