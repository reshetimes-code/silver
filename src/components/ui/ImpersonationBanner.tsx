'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import Swal from '@/lib/swal';

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
  const [returning, setReturning] = useState(false);

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

  const handleReturn = async () => {
    if (returning) return;
    setReturning(true);
    const result = await api.returnToAdmin();
    if (result === 'restored') {
      window.location.href = '/admin';
      return;
    }
    // Neither 'none' nor 'expired' touches the current (impersonated)
    // session — it's a real, working login right there, so there's no
    // reason to force the admin out of the app over a stash that was
    // missing or stale. Just tell them plainly instead.
    setReturning(false);
    setImpersonating(api.isImpersonating());
    Swal.fire({
      icon: 'info',
      title: result === 'expired'
        ? (he ? 'הפעלת הניהול המקורית פגה' : 'Your original admin session expired')
        : (he ? 'לא נמצאה הפעלת ניהול לחזרה' : 'No admin session found to return to'),
      text: he
        ? 'תוכל להתחבר מחדש כמנהל, או להמשיך להשתמש בחשבון הנוכחי.'
        : 'You can log in again as an admin, or keep using this account.',
      confirmButtonColor: '#D4AF37',
      background: '#0a0a0a',
      color: '#fff',
    });
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
        disabled={returning}
        className="px-3 py-1 rounded-full bg-black/80 text-[#D4AF37] active:scale-95 transition-transform disabled:opacity-60"
      >
        {returning ? (he ? '...בודק' : 'Checking...') : (he ? '↩ חזרה לניהול' : '↩ Return to admin')}
      </button>
    </div>
  );
}
