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

const PHOTO_WIDTH = 2160;
const PHOTO_HEIGHT = 3840;

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
  // Fixed 9:16 aspect ratio
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isRtl = locale === 'he';
  const he = locale === 'he';
  // Fixed 9:16 ratio

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
        const targetRatio = PHOTO_WIDTH / PHOTO_HEIGHT; // 9:16

        if (srcW / srcH > targetRatio) {
          cropH = srcH;
          cropW = Math.round(srcH * targetRatio);
          cropX = Math.round((srcW - cropW) / 2);
          cropY = 0;
        } else {
          cropW = srcW;
          cropH = Math.round(srcW / targetRatio);
          cropX = 0;
          cropY = Math.round((srcH - cropH) / 2);
        }

        canvas.width = PHOTO_WIDTH;
        canvas.height = PHOTO_HEIGHT;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        resolve(canvas.toDataURL('image/jpeg', 1.0));
      };
      img.src = imageSrc;
    });
  }, []);

  const captureNow = useCallback(async () => {
    // Capture at FULL video resolution, not display size
    const video = webcamRef.current?.video;
    if (!video) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = vw;
    captureCanvas.height = vh;
    const ctx = captureCanvas.getContext('2d')!;

    // If front camera, mirror horizontally
    if (facingMode === 'user') {
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, vw, vh);

    const fullResImage = captureCanvas.toDataURL('image/jpeg', 1.0);
    const cropped = await cropToAspectRatio(fullResImage);
    setCapturedImage(cropped);
  }, [cropToAspectRatio, facingMode]);

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
          <p className="text-sm text-white/50 mb-5">{t(locale, 'maxPrintsReached')}</p>
          <button className="btn-secondary w-full" onClick={() => router.push('/')}>
            {he ? 'חזרה לדף הבית' : 'Back to Home'}
          </button>
        </motion.div>
      </div>
    );
  }

  // Fixed 9:16 viewfinder

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
          <div className="mb-3">
            <Logo size="lg" />
          </div>

          {/* Personal welcome */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-bold text-gold mb-1"
          >
            {he ? 'ברוכים הבאים ל' : 'Welcome to'}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-black text-white mb-1"
          >
            {event.name}
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-20 h-[1px] mx-auto mb-4"
            style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
          />

          <p className="text-sm text-white/40 mb-4">{t(locale, 'enterPhone')}</p>
          <p className="text-xs text-white/25 mb-4">{t(locale, 'phoneRequired')}</p>

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
          <Logo size="lg" animate={false} />
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

          {/* ===== CAMERA VIEW — FULLSCREEN ===== */}
          {mode === 'camera' && !capturedImage && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black flex flex-col">

              {/* Full-screen viewfinder */}
              <div className="flex-1 relative overflow-hidden">
                <Webcam key={facingMode} ref={webcamRef} audio={false}
                  screenshotFormat="image/jpeg" screenshotQuality={1}
                  videoConstraints={{ facingMode, width: { ideal: 1920, min: 1280 }, height: { ideal: 1920, min: 1280 } }}
                  className="absolute inset-0 w-full h-full object-cover"
                  mirrored={facingMode === 'user'}
                />

                {/* Viewfinder corners */}
                <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />

                {/* Top overlay — timer + aspect ratio */}
                <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)', opacity: countdown !== null ? 0.4 : 1, pointerEvents: countdown !== null ? 'none' : 'auto' }}>
                  {/* Timer */}
                  <div className="flex items-center gap-1.5">
                    {TIMER_OPTIONS.map((sec) => (
                      <button key={sec}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${timerSeconds === sec
                          ? 'bg-primary text-black'
                          : 'bg-black/40 text-white/60 active:bg-white/20'}`}
                        onClick={() => { setTimerSeconds(sec); cancelTimer(); }}>
                        {sec === 0 ? (he ? 'ללא' : 'Off') : `${sec}s`}
                      </button>
                    ))}
                  </div>

                  {/* Prints remaining */}
                  <div className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-black/40 text-[#D4AF37]">
                    {printsRemaining} {he ? 'נותרו' : 'left'}
                  </div>
                </div>

                {/* Countdown overlay */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center z-30"
                      style={{ background: 'rgba(0,0,0,0.4)' }}
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

              {/* Bottom Controls — fixed at bottom */}
              <div className="relative z-20 flex items-center justify-center gap-8 py-5 px-4"
                style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
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
              <div className="camera-viewfinder w-full overflow-hidden aspect-[9/16]"
                style={{ maxHeight: '65vh' }}>
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover rounded-2xl" />
                <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />
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
