'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface EventData { id: string; name: string; date: string; active: boolean; }
interface AuthUser { id: string; email: string; name: string; role: string; }

export default function DashboardPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { locale, toggleLocale } = useStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const isRtl = locale === 'he';
  const he = locale === 'he';
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    const token = api.getStoredToken();
    if (!token) {
      router.push('/login');
      return;
    }
    api.getMe().then((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);
      api.getEvents().then((evs: EventData[]) => {
        setEvents(evs.filter((e) => e.active));
        setLoading(false);
      });
    }).catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative flex flex-col bg-black" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />

      {/* Header with hamburger */}
      <div className="app-header flex items-center justify-between relative z-20">
        <Link href="/"><Logo size="md" animate={false} /></Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1.5 active:scale-90 transition-transform"
        >
          <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 5 : 0 }}
            className="w-5 h-[2px] block" style={{ background: '#D4AF37' }} />
          <motion.span animate={{ opacity: menuOpen ? 0 : 1 }}
            className="w-5 h-[2px] block" style={{ background: '#D4AF37' }} />
          <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -5 : 0 }}
            className="w-5 h-[2px] block" style={{ background: '#D4AF37' }} />
        </button>
      </div>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: isRtl ? -300 : 300 }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? -300 : 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className={`fixed top-0 ${isRtl ? 'left-0' : 'right-0'} w-72 h-full z-40 overflow-y-auto`}
              style={{
                background: 'rgba(10,10,10,0.97)',
                backdropFilter: 'blur(20px)',
                borderLeft: isRtl ? 'none' : '1px solid rgba(212,175,55,0.1)',
                borderRight: isRtl ? '1px solid rgba(212,175,55,0.1)' : 'none',
              }}
            >
              <div className="p-6">
                {/* User info */}
                <div className="mb-6 pb-4 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2"
                    style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', color: '#D4AF37' }}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-white">{user?.name}</p>
                  <p className="text-[10px] text-white/30">{user?.email}</p>
                  <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: isSuperAdmin ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.08)', color: isSuperAdmin ? '#D4AF37' : 'rgba(255,255,255,0.5)' }}>
                    {isSuperAdmin ? (he ? 'מנהל אתר' : 'Super Admin') : (he ? 'מנהל חשבון' : 'Account Manager')}
                  </span>
                </div>

                {/* Menu items */}
                <nav className="space-y-1">
                  <Link href="/admin" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                    {he ? 'לוח בקרה' : 'Admin Panel'}
                  </Link>

                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {he ? 'האירועים שלי' : 'My Events'}
                  </Link>

                  <button onClick={() => { toggleLocale(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    {he ? 'English' : 'עברית'}
                  </button>

                  <div className="pt-3 mt-2 border-t border-[rgba(212,175,55,0.12)]">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 px-3 mb-1">{he ? 'שיווק' : 'Marketing'}</p>
                    <Link href="/admin?tab=leads" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {he ? 'לידים חדשים' : 'New Leads'}
                    </Link>
                  </div>

                  <div className="pt-4 border-t border-white/10 mt-4">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-400/70 hover:bg-red-500/5 active:bg-red-500/10 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      {he ? 'התנתק' : 'Logout'}
                    </button>
                  </div>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Welcome section */}
      <div className="relative z-10 px-5 pt-4 pb-2 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-white/40"
        >
          {he ? 'שלום' : 'Welcome'}, <span className="text-white font-bold">{user?.name}</span>
        </motion.p>
      </div>

      {/* Events */}
      <main className="flex-1 flex flex-col items-center px-5 py-4 relative z-10">
        <h3 className="text-center text-[10px] uppercase tracking-[0.3em] mb-4"
          style={{ color: 'rgba(212, 175, 55, 0.3)' }}>
          {he ? 'האירועים שלי' : 'My Events'}
        </h3>

        {events.length > 0 ? (
          <div className="w-full max-w-sm space-y-3">
            <AnimatePresence>
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, type: 'spring', damping: 15 }}
                >
                  <Link href={`/event/${event.id}`}>
                    <motion.div
                      className="glass-card p-5 flex items-center justify-between group"
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-bold text-white truncate group-active:text-gold transition-colors">
                          {event.name}
                        </h4>
                        <p className="text-sm text-white/30 mt-1 flex items-center gap-2">
                          <span className="status-dot active" />
                          {event.date.replace(/-/g, '.')}
                        </p>
                      </div>
                      <div
                        className="flex-shrink-0 ml-3 w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                          border: '1px solid rgba(212,175,55,0.2)',
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                          <path d={isRtl ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center glass-card p-8 max-w-xs w-full"
          >
            <div className="text-4xl mb-3">📷</div>
            <p className="text-white/30 text-sm">{he ? 'אין אירועים פעילים' : 'No active events'}</p>
            <Link href="/admin">
              <button className="btn-glow mt-4 text-sm w-full">
                {he ? 'צור אירוע חדש' : 'Create New Event'}
              </button>
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
