'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

/**
 * Fixed top bar shown on every page while a super admin is "logged in as"
 * another user (see api.loginAsUser). Lets them jump back to their own
 * admin session from anywhere, without having to log out/in again.
 * Reads localStorage directly (not React state shared with the rest of the
 * app), so it's mounted once in the root layout and just polls on focus —
 * simplest way to stay correct across full page navigations.
 */
export default function ImpersonationBanner() {
  const { locale } = useStore();
  const he = locale === 'he';
  const [impersonating, setImpersonating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const check = () => {
      const active = api.isImpersonating();
      setImpersonating(active);
      // Push page content down so the banner doesn't sit on top of each
      // page's own sticky header — see the matching rule in globals.css.
      document.body.classList.toggle('impersonating', active);
      try {
        const raw = localStorage.getItem('auth-user');
        setName(raw ? JSON.parse(raw).name || '' : '');
      } catch {
        setName('');
      }
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  if (!impersonating) return null;

  const handleReturn = () => {
    if (api.returnToAdmin()) {
      window.location.href = '/admin';
      return;
    }
    // The stashed admin session is missing (cleared storage, an old/odd
    // state, etc.) — previously this just did nothing, which looked like a
    // dead button. There's no session left to safely return to, so send
    // them to log back in rather than leave them stuck on someone else's
    // account with no way out.
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    localStorage.removeItem('impersonator-token');
    localStorage.removeItem('impersonator-user');
    window.location.href = '/login';
  };

  return (
    <div
      className="fixed top-0 inset-x-0 z-[10000] flex items-center justify-center gap-3 px-4 py-2 text-xs sm:text-sm font-bold text-black"
      style={{ background: '#D4AF37' }}
    >
      <span>
        {he ? `מחובר בתור ${name || '...'}` : `Logged in as ${name || '...'}`}
      </span>
      <button
        onClick={handleReturn}
        className="px-3 py-1 rounded-full bg-black/80 text-[#D4AF37] active:scale-95 transition-transform"
      >
        {he ? '↩ חזרה לניהול' : '↩ Return to admin'}
      </button>
    </div>
  );
}
