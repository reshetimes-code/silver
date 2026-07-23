'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import LanguageToggle from '@/components/ui/LanguageToggle';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';

interface EventData { id: string; name: string; date: string; active: boolean; }

export default function LandingPage() {
  const hydrated = useHydrated();
  const { locale } = useStore();
  const [activeEvents, setActiveEvents] = useState<EventData[]>([]);

  useEffect(() => {
    api.getEvents().then((evs: EventData[]) => setActiveEvents(evs.filter((e) => e.active)));
  }, []);

  if (!hydrated) return null;

  const isRtl = locale === 'he';

  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      {/* Top gold accent line */}
      <div className="h-[1px] gold-shimmer" />

      {/* Main content - centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8 relative z-10">

        {/* Logo with grand entrance */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
          className="mb-3"
        >
          <Logo size="lg" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xs uppercase tracking-[0.3em] mb-10"
          style={{ color: 'rgba(212, 175, 55, 0.5)' }}
        >
          Capture &bull; Print &bull; Share
        </motion.p>

        {/* Decorative gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="w-32 h-[1px] mb-10"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
        />

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full max-w-sm space-y-3"
          >
            <h3 className="text-center text-xs uppercase tracking-[0.25em] mb-4"
              style={{ color: 'rgba(212, 175, 55, 0.4)' }}>
              {t(locale, 'events')}
            </h3>
            <AnimatePresence>
              {activeEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.1 }}
                >
                  <Link href={`/event/${event.id}`}>
                    <div className="glass-card p-5 flex items-center justify-between active:scale-[0.98] transition-transform group">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-white truncate group-active:text-gold transition-colors">
                          {event.name}
                        </h4>
                        <p className="text-xs text-white/30 mt-1">{event.date.replace(/-/g, '.')}</p>
                      </div>
                      <div className="flex-shrink-0 ml-3 w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* No events state */}
        {activeEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-center"
          >
            <p className="text-white/30 text-sm">{isRtl ? 'אין אירועים פעילים' : 'No active events'}</p>
          </motion.div>
        )}

        {/* Admin Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-12"
        >
          <Link href="/admin">
            <button className="btn-secondary text-sm">
              {t(locale, 'admin')}
            </button>
          </Link>
        </motion.div>
      </main>

      {/* Bottom gold accent */}
      <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' }} />
    </div>
  );
}
