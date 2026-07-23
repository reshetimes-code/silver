'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { getDeviceId } from '@/lib/device-id';
import { api } from '@/lib/api';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Logo from '@/components/ui/Logo';
import Footer from '@/components/ui/Footer';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Webcam from 'react-webcam';

interface EventData {
  id: string;
  name: string;
  date: string;
  maxPrintsPerDevice: number;
  active: boolean;
}

const TIMER_OPTIONS = [0, 3, 5, 10] as const;
type TimerValue = typeof TIMER_OPTIONS[number];

type AspectRatio = '1:1' | '9:16';

const ASPECT_RATIOS: { value: AspectRatio; label: string; labelHe: string; icon: string; width: number; height: number }[] = [
  { value: '1:1', label: 'Square', labelHe: 'מרובע', icon: '⬜', width: 1080, height: 1080 },
  { value: '9:16', label: 'TikTok', labelHe: 'טיקטוק', icon: '📱', width: 1080, height: 1920 },
];

export default function CapturePhotoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale, getDevicePrintCount, guestPhone, setGuestPhone } = useStore();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'phone' | 'choose' | 'camera' | 'upload'>('phone');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [timerSeconds, setTimerSeconds] = useState<TimerValue>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isRtl = locale === 'he';
  const he = locale === 'he';
  const currentAR = ASPECT_RATIOS.find(a => a.value === aspectRatio)!;

  useEffect(() => {
    api.getEvent(eventId).then((data) => {
      setEvent(data);
      setLoading(false);
    });
  }, [eventId]);

  useEffect(() => {
    if (guestPhone && mode === 'phone') {
      setPhoneInput(guestPhone);
      setMode('choose');
    }
  }, [guestPhone, mode]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^0[0-9]{8,9}$/.test(cleaned) || /^\+?[0-9]{10,15}$/.test(cleaned);
  };

  const handlePhoneSubmit = () => {
    if (!validatePhone(phoneInput)) {
      setPhoneError(true);
      return;
    }
    setGuestPhone(phoneInput);
    setMode('choose');
  };

  // Crop the webcam screenshot to the selected aspect ratio
  const cropToAspectRatio = useCallback((imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const srcW = img.width;
        const srcH = img.height;

        let cropW: number, cropH: number, cropX: number, cropY: number;
        const targetRatio = currentAR.width / currentAR.height;
        const srcRatio = srcW / srcH;

        if (srcRatio > targetRatio) {
          // Source is wider — crop sides
          cropH = srcH;
          cropW = srcH * targetRatio;
          cropX = (srcW - cropW) / 2;
          cropY = 0;
        } else {
          // Source is taller — crop top/bottom
          cropW = srcW;
          cropH = srcW / targetRatio;
          cropX = 0;
          cropY = (srcH - cropH) / 2;
        }

        canvas.width = currentAR.width;
        canvas.height = currentAR.height;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, currentAR.width, currentAR.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = imageSrc;
    });
  }, [currentAR]);

  const captureNow = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const cropped = await cropToAspectRatio(imageSrc);
      setCapturedImage(cropped);
    }
  }, [cropToAspectRatio]);

  const cancelTimer = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  const capture = useCallback(() => {
    if (countdownRef.current) return;
    if (timerSeconds === 0) {
      captureNow();
      return;
    }
    let remaining = timerSeconds;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountdown(null);
        captureNow();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [timerSeconds, captureNow]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const cropped = await cropToAspectRatio(raw);
      setCapturedImage(cropped);
    };
    reader.readAsDataURL(file);
  };

  const goToPreview = () => {
    if (capturedImage) {
      sessionStorage.setItem('photobooth-captured-image', capturedImage);
      router.push(`/event/${eventId}/preview`);
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-transparent"
            style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }}
          />
          <span className="text-xs text-white/30 tracking-widest uppercase">{he ? 'טוען...' : 'Loading...'}</span>
        </motion.div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <span className="text-5xl block mb-3">😕</span>
          <h2 className="text-xl font-bold text-white mb-2">{t(locale, 'error')}</h2>
          <p className="text-sm text-white/50">Event not found</p>
        </motion.div>
      </div>
    );
  }

  const deviceId = getDeviceId();
  const printCount = getDevicePrintCount(eventId, deviceId);
  const printsRemaining = event.maxPrintsPerDevice - printCount;

  if (printsRemaining <= 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground />
        <LanguageToggle />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center max-w-sm relative z-10">
          <span className="text-5xl block mb-4">🚫</span>
          <h2 className="text-xl font-bold text-white mb-3">{t(locale, 'noPrintsLeft')}</h2>
          <p className="text-sm text-white/50">{t(locale, 'maxPrintsReached')}</p>
        </motion.div>
      </div>
    );
  }

  // Aspect ratio CSS for viewfinder clipping
  const viewfinderAspect = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square';

  // ===== PHONE ENTRY SCREEN =====
  if (mode === 'phone') {
    return (
      <div className="min-h-dvh relative flex flex-col items-center justify-center px-5" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground />
        <LanguageToggle />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 w-full max-w-sm relative z-10 text-center"
        >
          {/* Logo */}
          <div className="mb-4">
            <Logo size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">{t(locale, 'enterPhone')}</h2>
          <p className="text-base text-white/40 mb-6">{t(locale, 'phoneRequired')}</p>

          <input
            type="tel"
            inputMode="tel"
            value={phoneInput}
            onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneSubmit(); }}
            placeholder={t(locale, 'phonePlaceholder')}
            className={`w-full px-4 py-5 rounded-xl bg-white/5 border text-white text-center text-2xl font-bold tracking-widest placeholder-white/20 focus:outline-none transition-colors ${phoneError ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
            dir="ltr"
            autoComplete="tel"
          />
          {phoneError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs mt-2"
            >
              {he ? 'מספר טלפון לא תקין' : 'Invalid phone number'}
            </motion.p>
          )}

          <motion.button
            className="btn-glow w-full mt-6"
            whileTap={{ scale: 0.96 }}
            onClick={handlePhoneSubmit}
          >
            {t(locale, 'continueBtn')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={isRtl ? "M19 12H5M12 5l-7 7 7 7" : "M5 12h14M12 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </motion.div>
        <Footer compact />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />

      {/* App Header */}
      <div className="app-header flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Logo size="md" animate={false} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div
            className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
            style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            {printsRemaining} {t(locale, 'remainingPrints')}
          </motion.div>
        </div>
      </div>

      {/* Event Name Bar */}
      <motion.div
        className="px-5 py-2 relative z-10 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white">{event.name}</h2>
        <p className="text-sm text-white/30 mt-0.5">{event.date.replace(/-/g, '.')}</p>
      </motion.div>

      <main className="flex-1 flex flex-col items-center justify-center px-3 pb-6 relative z-10">
        <AnimatePresence mode="wait">

          {/* ===== CHOOSE MODE ===== */}
          {mode === 'choose' && !capturedImage && (
            <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4 items-center w-full max-w-sm">

              {/* Big Logo */}
              <div className="mb-2">
                <Logo size="lg" />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="w-full">
                <p className="text-xs text-white/30 text-center mb-2 tracking-wider uppercase">
                  {he ? 'גודל תמונה' : 'Photo Size'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {ASPECT_RATIOS.map((ar) => (
                    <motion.button
                      key={ar.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAspectRatio(ar.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        aspectRatio === ar.value
                          ? 'bg-primary/20 text-[#F4E5B0] border border-primary/40'
                          : 'bg-white/5 text-white/40 border border-white/5 active:bg-white/10'
                      }`}
                    >
                      <span className="text-base">{ar.icon}</span>
                      <span>{he ? ar.labelHe : ar.label}</span>
                      <span className="text-[10px] opacity-50">{ar.value}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button className="btn-glow w-full text-lg" whileTap={{ scale: 0.96 }} onClick={() => setMode('camera')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="14" rx="3" />
                  <circle cx="12" cy="13" r="4" />
                  <path d="M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6" />
                </svg>
                {t(locale, 'takePhoto')}
              </motion.button>

              <motion.button className="btn-secondary w-full text-lg" whileTap={{ scale: 0.96 }}
                onClick={() => fileInputRef.current?.click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                {t(locale, 'uploadPhoto')}
              </motion.button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </motion.div>
          )}

          {/* ===== CAMERA VIEW ===== */}
          {mode === 'camera' && !capturedImage && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-lg flex flex-col items-center gap-3">

              {/* Top controls: Timer + Aspect Ratio */}
              <div className="flex items-center justify-between w-full px-1" style={{ opacity: countdown !== null ? 0.4 : 1, pointerEvents: countdown !== null ? 'none' : 'auto' }}>
                {/* Timer */}
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" strokeLinecap="round" />
                  </svg>
                  {TIMER_OPTIONS.map((sec) => (
                    <button key={sec}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${timerSeconds === sec
                        ? 'bg-primary text-black'
                        : 'bg-white/10 text-white/50 active:bg-white/20'}`}
                      onClick={() => { setTimerSeconds(sec); cancelTimer(); }}>
                      {sec === 0 ? (he ? 'ללא' : 'Off') : `${sec}s`}
                    </button>
                  ))}
                </div>

                {/* Aspect ratio mini toggle */}
                <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
                  {ASPECT_RATIOS.map((ar) => (
                    <button key={ar.value}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                        aspectRatio === ar.value ? 'bg-primary/30 text-[#F4E5B0]' : 'text-white/30'
                      }`}
                      onClick={() => setAspectRatio(ar.value)}>
                      {ar.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Viewfinder with aspect ratio */}
              <div className={`camera-viewfinder w-full relative overflow-hidden ${viewfinderAspect}`}
                style={{ maxHeight: aspectRatio === '9:16' ? '65vh' : '80vw' }}>
                <Webcam key={`${facingMode}-${aspectRatio}`} ref={webcamRef} audio={false}
                  screenshotFormat="image/jpeg" screenshotQuality={0.92}
                  videoConstraints={{ facingMode, width: { ideal: 1920 }, height: { ideal: aspectRatio === '9:16' ? 3413 : 1920 } }}
                  className="w-full h-full object-cover rounded-2xl"
                  mirrored={facingMode === 'user'}
                />
                <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />

                {/* Aspect ratio indicator */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(212,175,55,0.6)', backdropFilter: 'blur(4px)' }}>
                  {aspectRatio === '1:1' ? (he ? 'מרובע' : 'Square') : 'TikTok'} {aspectRatio}
                </div>

                {/* Countdown overlay */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center rounded-2xl z-10"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.span
                        key={countdown}
                        initial={{ scale: 2.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', damping: 12 }}
                        className="countdown-number"
                      >
                        {countdown}
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-center gap-6 py-2">
                {/* Close */}
                <motion.button
                  className="control-btn"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { cancelTimer(); setMode('choose'); }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </motion.button>

                {/* Shutter / Stop */}
                {countdown !== null ? (
                  <motion.button className="shutter-btn" whileTap={{ scale: 0.85 }} onClick={cancelTimer}
                    style={{ background: 'linear-gradient(135deg, #666, #888)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </motion.button>
                ) : (
                  <motion.button
                    className="shutter-btn pulse-ring"
                    whileTap={{ scale: 0.85 }}
                    onClick={capture}
                  >
                    <div className="shutter-btn-inner" />
                    {timerSeconds > 0 && (
                      <span className="absolute text-black text-xs font-bold">{timerSeconds}s</span>
                    )}
                  </motion.button>
                )}

                {/* Flip camera */}
                <motion.button
                  className="control-btn"
                  whileTap={{ scale: 0.85 }}
                  disabled={countdown !== null}
                  style={{ opacity: countdown !== null ? 0.4 : 1 }}
                  onClick={() => setFacingMode((f) => f === 'user' ? 'environment' : 'user')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ===== CAPTURED PHOTO PREVIEW ===== */}
          {capturedImage && (
            <motion.div key="captured" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-4">
              <div className={`camera-viewfinder w-full overflow-hidden ${viewfinderAspect}`}
                style={{ maxHeight: aspectRatio === '9:16' ? '60vh' : '80vw' }}>
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover rounded-2xl" />
                <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />
              </div>

              {/* Aspect ratio badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.15)' }}>
                  {aspectRatio === '1:1' ? (he ? 'מרובע' : 'Square') : 'TikTok'} {aspectRatio}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full">
                <motion.button className="btn-secondary flex-1" whileTap={{ scale: 0.96 }}
                  onClick={() => { setCapturedImage(null); setMode('choose'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3.51 15a9 9 0 1014.85-9.36L1 10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t(locale, 'retake')}
                </motion.button>
                <motion.button className="btn-glow flex-1" whileTap={{ scale: 0.96 }} onClick={goToPreview}>
                  {t(locale, 'usePhoto')}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={isRtl ? "M19 12H5M12 5l-7 7 7 7" : "M5 12h14M12 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer compact />
    </div>
  );
}
