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

      {/* Main content - centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8 relative z-10">

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 0.1 }}
          className="mb-5"
        >
          <Logo size="lg" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-base sm:text-xl text-white/60 text-center mb-8 max-w-xs sm:max-w-md"
        >
          {t(locale, 'scanQR')}
        </motion.p>

        {/* Animated QR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="relative mb-10"
        >
          <div className="w-32 h-32 sm:w-40 sm:h-40 glass-card flex items-center justify-center float-animation relative pulse-ring rounded-2xl">
            <svg viewBox="0 0 100 100" className="w-20 h-20 sm:w-24 sm:h-24" fill="none">
              <rect x="10" y="10" width="25" height="25" rx="3" fill="#e94560" />
              <rect x="65" y="10" width="25" height="25" rx="3" fill="#e94560" />
              <rect x="10" y="65" width="25" height="25" rx="3" fill="#e94560" />
              <rect x="15" y="15" width="15" height="15" rx="2" fill="#0a0a1a" />
              <rect x="70" y="15" width="15" height="15" rx="2" fill="#0a0a1a" />
              <rect x="15" y="70" width="15" height="15" rx="2" fill="#0a0a1a" />
              <rect x="19" y="19" width="7" height="7" rx="1" fill="#e94560" />
              <rect x="74" y="19" width="7" height="7" rx="1" fill="#e94560" />
              <rect x="19" y="74" width="7" height="7" rx="1" fill="#e94560" />
              <rect x="40" y="10" width="5" height="5" fill="#0f3460" />
              <rect x="50" y="10" width="5" height="5" fill="#0f3460" />
              <rect x="40" y="40" width="5" height="5" fill="#0f3460" />
              <rect x="55" y="40" width="5" height="5" fill="#0f3460" />
              <rect x="65" y="45" width="5" height="5" fill="#0f3460" />
              <rect x="50" y="65" width="5" height="5" fill="#0f3460" />
              <rect x="75" y="75" width="5" height="5" fill="#0f3460" />
              <rect x="65" y="85" width="5" height="5" fill="#0f3460" />
            </svg>
          </div>
        </motion.div>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-sm space-y-3"
          >
            <h3 className="text-center text-white/40 text-xs uppercase tracking-[0.2em] mb-3">
              {t(locale, 'events')}
            </h3>
            <AnimatePresence>
              {activeEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: isRtl ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.08 }}
                >
                  <Link href={`/event/${event.id}`}>
                    <div className="glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform group">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-white truncate group-active:text-primary transition-colors">
                          {event.name}
                        </h4>
                        <p className="text-xs text-white/40 mt-0.5">{event.date}</p>
                      </div>
                      <div className="flex-shrink-0 ml-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">📸</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Admin Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10"
        >
          <Link href="/admin">
            <button className="btn-secondary text-sm">
              {t(locale, 'admin')}
            </button>
          </Link>
        </motion.div>
      </main>

      {/* Bottom accent line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
}
