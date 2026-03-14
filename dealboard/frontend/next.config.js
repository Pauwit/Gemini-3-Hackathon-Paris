// ============================================================
// next.config.js — Next.js 14 Configuration
// ============================================================
//
// PURPOSE:
// Configures Next.js 14 for the DealBoard frontend.
// Key settings:
//   - Enables React strict mode for catching side-effect bugs
//   - Configures image domains for any hosted logos
//   - Disables x-powered-by header for security
//   - Optimizes lucide-react icon imports
//
// DEPENDENCIES: None (read at build time by Next.js)
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── React ──────────────────────────────────────────────
  reactStrictMode: true,

  // ── Security ───────────────────────────────────────────
  poweredByHeader: false,

  // ── Images ─────────────────────────────────────────────
  images: {
    domains: ['lh3.googleusercontent.com', 'accounts.google.com'],
  },

  // ── Experimental ───────────────────────────────────────
  experimental: {
    // Optimize package imports for large icon libraries
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
