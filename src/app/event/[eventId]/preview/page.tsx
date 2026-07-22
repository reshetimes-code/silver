'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { getDeviceId } from '@/lib/device-id';
import { api } from '@/lib/api';
import OverlayRenderer from '@/components/overlays/OverlayRenderer';
import LanguageToggle from '@/components/ui/LanguageToggle';
import ParticleBackground from '@/components/ui/ParticleBackground';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

interface OverlayData { id: string; name: string; url: string; }
interface EventData { id: string; name: string; maxPrintsPerDevice: number; }

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale, incrementDevicePrints, getDevicePrintCount, guestPhone } = useStore();

  const [image, setImage] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [submittedPhotoId, setSubmittedPhotoId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);
  const isRtl = locale === 'he';
  const he = locale === 'he';

  useEffect(() => {
    const stored = sessionStorage.getItem('photobooth-captured-image');
    if (stored) setImage(stored);

    Promise.all([api.getEvent(eventId), api.getOverlays()]).then(([ev, ovs]) => {
      setEvent(ev);
      setOverlays(ovs);
      setLoading(false);
    });
  }, [eventId]);

  const handlePrint = async () => {
    if (!event || !image || !selectedOverlayId) return;

    const deviceId = getDeviceId();
    const printCount = getDevicePrintCount(eventId, deviceId);
    if (printCount >= event.maxPrintsPerDevice) return;

    setPrinting(true);
    setModerationError(null);

    const result = await api.submitPhoto({
      eventId,
      overlayId: selectedOverlayId,
      image,
      deviceId,
      phoneNumber: guestPhone,
    });

    if (result.error) {
      setPrinting(false);
      if (result.reason === 'no_face') {
        setModerationError(t(locale, 'noFaceDetected'));
      } else if (result.reason === 'adult_content' || result.reason === 'violence') {
        setModerationError(t(locale, 'inappropriateContent'));
      } else {
        setModerationError(t(locale, 'photoRejected'));
      }
      return;
    }

    // Photo accepted (approved or pending_review)
    setSubmittedPhotoId(result.id);
    incrementDevicePrints(eventId, deviceId);
    setPrintSuccess(true);
    setPrinting(false);
    sessionStorage.removeItem('photobooth-captured-image');
  };

  const handleSendWhatsApp = () => {
    if (!submittedPhotoId) return;
    const photoUrl = api.getPhotoImageUrl(submittedPhotoId);
    const eventName = event?.name || 'Event';
    const message = he
      ? `📸 התמונה שלי מהאירוע ${eventName}\n${photoUrl}`
      : `📸 My photo from ${eventName}\n${photoUrl}`;

    // Format phone for WhatsApp (remove leading 0, add Israel code if needed)
    let waPhone = guestPhone.replace(/[\s\-()]/g, '');
    if (waPhone.startsWith('0')) {
      waPhone = '972' + waPhone.slice(1);
    }

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-4xl">⏳</motion.div>
      </div>
    );
  }

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

  // ===== SUCCESS SCREEN (with WhatsApp share) =====
  if (printSuccess) {
    return (
      <div className="min-h-dvh relative flex flex-col items-center justify-center px-5" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground /><LanguageToggle />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}
          className="glass-card p-8 text-center w-full max-w-sm relative z-10 overflow-hidden">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00C851, #00E676)' }}>
            <svg className="w-12 h-12" viewBox="0 0 50 50">
              <path className="checkmark-path" d="M10 25 L20 35 L40 15" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl font-bold text-white mb-3">{t(locale, 'printSent')}</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-sm text-white/50 mb-6">{t(locale, 'printMessage')}</motion.p>
          {[...Array(16)].map((_, i) => (
            <motion.div key={i} className="absolute w-2.5 h-2.5 rounded-full"
              style={{ background: ['#e94560', '#0f3460', '#FFD700', '#00E676', '#FF6B6B', '#2196F3'][i % 6], left: '50%', top: '35%' }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: (seededRandom(i + 10) - 0.5) * 250, y: (seededRandom(i + 30) - 0.5) * 250, opacity: 0, scale: [1, 1.3, 0] }}
              transition={{ duration: 1.2, delay: 0.2 + i * 0.04, ease: 'easeOut' }} />
          ))}

          {/* WhatsApp share button */}
          {guestPhone && submittedPhotoId && (
            <motion.button
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              className="w-full py-3 rounded-2xl text-base font-bold border border-green-500/30 mb-3 active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}
              onClick={handleSendWhatsApp}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t(locale, 'sendToWhatsApp')}
            </motion.button>
          )}

          <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            className="btn-glow w-full" onClick={() => router.push(`/event/${eventId}`)}>
            📸 {t(locale, 'printAnother')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // STEP 1: Choose overlay
  if (!selectedOverlayId) {
    return (
      <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground /><LanguageToggle />
        <div className="app-header flex items-center justify-center">
          <h2 className="text-base font-bold text-white/80">{he ? 'בחר מסגרת' : 'Choose a Frame'} 🖼️</h2>
        </div>
        <main className="flex-1 px-4 py-4 relative z-10 overflow-y-auto">
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border-2 border-primary/30">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            {overlays.map((overlay, i) => (
              <motion.button key={overlay.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden active:scale-95 transition-transform" onClick={() => setSelectedOverlayId(overlay.id)}>
                <div className="relative overflow-hidden">
                  <img src={overlay.url} alt={overlay.name} className="relative w-full h-auto block z-10 pointer-events-none" />
                  <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
                </div>
                <div className="p-2 text-center"><p className="text-xs font-bold text-white/70 truncate">{overlay.name}</p></div>
              </motion.button>
            ))}
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: overlays.length * 0.05 }}
              className="glass-card overflow-hidden active:scale-95 transition-transform" onClick={() => setSelectedOverlayId('none')}>
              <div className="aspect-[3/4] relative"><img src={image} alt="" className="w-full h-full object-cover" /></div>
              <div className="p-2 text-center"><p className="text-xs font-bold text-white/70">{he ? 'ללא מסגרת' : 'No Frame'}</p></div>
            </motion.button>
          </div>
          {overlays.length === 0 && (
            <div className="text-center mt-8">
              <p className="text-white/40 text-sm">{he ? 'אין מסגרות זמינות' : 'No overlays available'}</p>
              <button className="btn-glow mt-4" onClick={() => setSelectedOverlayId('none')}>{he ? 'המשך בלי מסגרת' : 'Continue without frame'}</button>
            </div>
          )}
        </main>
        <div className="bottom-bar">
          <button className="btn-secondary w-full max-w-sm mx-auto" onClick={() => router.push(`/event/${eventId}`)}>← {t(locale, 'retake')}</button>
        </div>
      </div>
    );
  }

  // STEP 2: Preview + Print
  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground /><LanguageToggle />
      <div className="app-header flex items-center justify-center">
        <h2 className="text-base font-bold text-white/80">{t(locale, 'preview')} ✨</h2>
      </div>
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-4 relative z-10 overflow-y-auto">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="w-full max-w-sm">
          {selectedOverlayId === 'none' ? (
            <div className="rounded-2xl overflow-hidden shadow-2xl"><img src={image} alt="Your photo" className="w-full" /></div>
          ) : (
            <OverlayRenderer overlayUrl={selectedOverlay?.url || ''}><img src={image} alt="Your photo" className="w-full h-full object-cover absolute inset-0" /></OverlayRenderer>
          )}
        </motion.div>

        {/* Moderation error */}
        {moderationError && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl border border-red-500/30 w-full max-w-sm text-center"
            style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <span className="text-2xl block mb-2">🚫</span>
            <p className="text-sm text-red-400 font-bold">{moderationError}</p>
            <button className="text-xs text-white/50 mt-2 underline" onClick={() => { setModerationError(null); setSelectedOverlayId(null); router.push(`/event/${eventId}`); }}>
              {he ? 'צלם תמונה חדשה' : 'Take a new photo'}
            </button>
          </motion.div>
        )}
      </main>
      <div className="bottom-bar">
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <button className="btn-secondary flex-1" onClick={() => setSelectedOverlayId(null)}>{he ? 'החלף מסגרת' : 'Change Frame'}</button>
          <motion.button className="btn-glow flex-[1.5] text-base" whileTap={{ scale: 0.96 }} onClick={handlePrint} disabled={printing}>
            {printing ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">⏳</motion.span>
              : <>🖨️ {t(locale, 'print')}</>}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
