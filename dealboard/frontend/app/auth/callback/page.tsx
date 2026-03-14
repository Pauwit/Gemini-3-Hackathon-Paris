'use client';

// Handles the redirect from the backend OAuth callback.
// Reads user info from URL params, stores in localStorage, goes to dashboard.

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth   = searchParams?.get('auth');
    const name   = searchParams?.get('name')  || 'User';
    const email  = searchParams?.get('email') || '';
    const avatar = searchParams?.get('avatar') || '';
    const error  = searchParams?.get('error');

    if (error) {
      router.replace(`/auth?error=${encodeURIComponent(error)}`);
      return;
    }

    if (auth === 'true') {
      localStorage.setItem('dealboard_auth', 'true');
      localStorage.setItem('dealboard_user', JSON.stringify({ name, email, avatar }));
      router.replace('/dashboard');
    } else {
      router.replace('/auth');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-[3px]"
        style={{
          borderColor:    '#E8EAED',
          borderTopColor: '#4285F4',
          animation:      'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}
