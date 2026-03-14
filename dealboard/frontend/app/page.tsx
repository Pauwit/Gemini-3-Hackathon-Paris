// ============================================================
// app/page.tsx — Root Page (Redirect to Dashboard)
// ============================================================
//
// PURPOSE: Redirects the root URL to /dashboard.
// PROTOCOL REFERENCE: N/A
// ============================================================

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
