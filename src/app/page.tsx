'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import Footer from '@/components/ui/Footer';
import LanguageToggle from '@/components/ui/LanguageToggle';
import ParticleBackground from '@/components/ui/ParticleBackground';
import HeroSlider from '@/components/ui/HeroSlider';
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
    <div className="min-h-dvh relative flex flex-col bg-black" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      {/* ===== TOP HALF: Hero Image Slider ===== */}
      <HeroSlider />

      {/* ===== BOTTOM HALF: Content ===== */}
      <main className="flex-1 flex flex-col items-center px-5 relative z-10 -mt-6">

        {/* Logo — big and centered */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.3, duration: 1 }}
          className="mb-1"
        >
          <Logo size="xl" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-xs uppercase tracking-[0.35em] mb-5"
          style={{ color: 'rgba(212, 175, 55, 0.45)' }}
        >
          {isRtl ? 'צלם • הדפס • שתף' : 'Capture • Print • Share'}
        </motion.p>

        {/* Decorative gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="w-36 h-[1px] mb-6"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #F4E5B0, #D4AF37, transparent)' }}
        />

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="w-full max-w-sm space-y-3"
          >
            <h3 className="text-center text-[10px] uppercase tracking-[0.3em] mb-3"
              style={{ color: 'rgba(212, 175, 55, 0.3)' }}>
              {t(locale, 'events')}
            </h3>
            <AnimatePresence>
              {activeEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.1, type: 'spring', damping: 15 }}
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
          </motion.div>
        )}

        {/* No events state */}
        {activeEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center glass-card p-8 max-w-xs w-full"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-4xl mb-3"
            >
              📷
            </motion.div>
            <p className="text-white/30 text-sm">{isRtl ? 'אין אירועים פעילים' : 'No active events'}</p>
            <p className="text-white/15 text-xs mt-1">{isRtl ? 'סרקו קוד QR כדי להתחיל' : 'Scan a QR code to get started'}</p>
          </motion.div>
        )}

        {/* Admin Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 mb-6"
        >
          <Link href="/admin">
            <motion.button
              className="btn-secondary text-sm"
              whileTap={{ scale: 0.95 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t(locale, 'admin')}
            </motion.button>
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
