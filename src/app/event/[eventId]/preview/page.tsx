'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { getDeviceId } from '@/lib/device-id';
import OverlayRenderer from '@/components/overlays/OverlayRenderer';
import LanguageToggle from '@/components/ui/LanguageToggle';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { v4 as uuidv4 } from 'uuid';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale, events, overlays, addPrintJob, incrementDevicePrints, getDevicePrintCount } = useStore();

  const [image, setImage] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const event = events.find((e) => e.id === eventId);
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);
  const isRtl = locale === 'he';
  const he = locale === 'he';

  useEffect(() => {
    const stored = sessionStorage.getItem('photobooth-captured-image');
    if (stored) setImage(stored);
  }, []);

  const handlePrint = async () => {
    if (!event || !image || !selectedOverlayId) return;

    const deviceId = getDeviceId();
    const printCount = getDevicePrintCount(eventId, deviceId);
    if (printCount >= event.maxPrintsPerDevice) return;

    setPrinting(true);

    try {
      await fetch('/api/print-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, image, overlayId: selectedOverlayId }),
      });
    } catch {
      // Continue on error
    }

    addPrintJob({
      id: uuidv4(),
      eventId,
      photoUrl: image,
      overlayId: selectedOverlayId,
      deviceId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    incrementDevicePrints(eventId, deviceId);
    setPrintSuccess(true);
    setPrinting(false);
    sessionStorage.removeItem('photobooth-captured-image');
  };

  if (!hydrated) return null;

  if (!event || !image) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="glass-card p-8 text-center">
          <span className="text-5xl block mb-3">😕</span>
          <h2 className="text-xl font-bold text-white mb-3">{t(locale, 'error')}</h2>
          <button className="btn-secondary" onClick={() => router.push(`/event/${eventId}`)}>{t(locale, 'back')}</button>
        </div>
      </div>
    );
  }

  // ====== PRINT SUCCESS ======
  if (printSuccess) {
    return (
      <div className="min-h-dvh relative flex flex-col items-center justify-center px-5" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground />
        <LanguageToggle />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}
          className="glass-card p-8 text-center w-full max-w-sm relative z-10 overflow-hidden">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00C851, #00E676)' }}>
            <svg className="w-12 h-12" viewBox="0 0 50 50">
              <path className="checkmark-path" d="M10 25 L20 35 L40 15" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-white mb-3">{t(locale, 'printSent')}</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-sm text-white/50 mb-6">{t(locale, 'printMessage')}</motion.p>
          {[...Array(16)].map((_, i) => (
            <motion.div key={i} className="absolute w-2.5 h-2.5 rounded-full"
              style={{ background: ['#e94560', '#0f3460', '#FFD700', '#00E676', '#FF6B6B', '#2196F3'][i % 6], left: '50%', top: '35%' }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: (seededRandom(i + 10) - 0.5) * 250, y: (seededRandom(i + 30) - 0.5) * 250, opacity: 0, scale: [1, 1.3, 0] }}
              transition={{ duration: 1.2, delay: 0.2 + i * 0.04, ease: 'easeOut' }} />
          ))}
          <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="btn-glow w-full" onClick={() => router.push(`/event/${eventId}`)}>
            📸 {t(locale, 'printAnother')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ====== STEP 1: CHOOSE OVERLAY ======
  if (!selectedOverlayId) {
    return (
      <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground />
        <LanguageToggle />

        <div className="app-header flex items-center justify-center">
          <h2 className="text-base font-bold text-white/80">
            {he ? 'בחר מסגרת' : 'Choose a Frame'} 🖼️
          </h2>
        </div>

        <main className="flex-1 px-4 py-4 relative z-10 overflow-y-auto">
          {/* Photo thumbnail */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border-2 border-primary/30">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Overlay grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            {overlays.map((overlay, i) => (
              <motion.button
                key={overlay.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden active:scale-95 transition-transform"
                onClick={() => setSelectedOverlayId(overlay.id)}
              >
                <div className="aspect-[3/4] relative">
                  {/* Show photo with overlay preview */}
                  <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <img src={overlay.url} alt={overlay.name} className="absolute inset-0 w-full h-full object-contain" />
                </div>
                <div className="p-2 text-center">
                  <p className="text-xs font-bold text-white/70 truncate">{overlay.name}</p>
                </div>
              </motion.button>
            ))}

            {/* No overlay option */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: overlays.length * 0.05 }}
              className="glass-card overflow-hidden active:scale-95 transition-transform"
              onClick={() => setSelectedOverlayId('none')}
            >
              <div className="aspect-[3/4] relative">
                <img src={image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-2 text-center">
                <p className="text-xs font-bold text-white/70">{he ? 'ללא מסגרת' : 'No Frame'}</p>
              </div>
            </motion.button>
          </div>

          {overlays.length === 0 && (
            <div className="text-center mt-8">
              <p className="text-white/40 text-sm">{he ? 'אין מסגרות זמינות' : 'No overlays available'}</p>
              <button className="btn-glow mt-4" onClick={() => setSelectedOverlayId('none')}>
                {he ? 'המשך בלי מסגרת' : 'Continue without frame'}
              </button>
            </div>
          )}
        </main>

        {/* Back button */}
        <div className="bottom-bar">
          <button className="btn-secondary w-full max-w-sm mx-auto" onClick={() => router.push(`/event/${eventId}`)}>
            ← {t(locale, 'retake')}
          </button>
        </div>
      </div>
    );
  }

  // ====== STEP 2: PREVIEW + PRINT ======
  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      <div className="app-header flex items-center justify-center">
        <h2 className="text-base font-bold text-white/80">{t(locale, 'preview')} ✨</h2>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-4 relative z-10 overflow-y-auto">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }} className="w-full max-w-sm">
          {selectedOverlayId === 'none' ? (
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img src={image} alt="Your photo" className="w-full" />
            </div>
          ) : (
            <OverlayRenderer overlayUrl={selectedOverlay?.url || ''}>
              <img src={image} alt="Your photo" className="w-full object-cover" />
            </OverlayRenderer>
          )}
        </motion.div>
      </main>

      <div className="bottom-bar">
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <button className="btn-secondary flex-1" onClick={() => setSelectedOverlayId(null)}>
            {he ? 'החלף מסגרת' : 'Change Frame'}
          </button>
          <motion.button className="btn-glow flex-[1.5] text-base" whileTap={{ scale: 0.96 }}
            onClick={handlePrint} disabled={printing}>
            {printing ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">⏳</motion.span>
            ) : (<>🖨️ {t(locale, 'print')}</>)}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
