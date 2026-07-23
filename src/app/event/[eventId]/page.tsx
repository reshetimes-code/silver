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
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRtl = locale === 'he';
  const he = locale === 'he';

  useEffect(() => {
    api.getEvent(eventId).then((data) => {
      setEvent(data);
      setLoading(false);
    });
  }, [eventId]);

  // Skip phone step if already entered
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

  const captureNow = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setCapturedImage(imageSrc);
  }, []);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
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
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-4xl">⏳</motion.div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="glass-card p-8 text-center">
          <span className="text-5xl block mb-3">😕</span>
          <h2 className="text-xl font-bold text-white mb-2">{t(locale, 'error')}</h2>
          <p className="text-sm text-white/50">Event not found</p>
        </div>
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
          <span className="text-5xl block mb-4">📱</span>
          <h2 className="text-xl font-bold text-white mb-2">{t(locale, 'enterPhone')}</h2>
          <p className="text-sm text-white/40 mb-6">{t(locale, 'phoneRequired')}</p>

          <input
            type="tel"
            inputMode="tel"
            value={phoneInput}
            onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneSubmit(); }}
            placeholder={t(locale, 'phonePlaceholder')}
            className={`w-full px-4 py-4 rounded-xl bg-white/5 border text-white text-center text-xl font-bold tracking-widest placeholder-white/20 focus:outline-none ${phoneError ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
            dir="ltr"
            autoComplete="tel"
          />
          {phoneError && (
            <p className="text-red-400 text-xs mt-2">{he ? 'מספר טלפון לא תקין' : 'Invalid phone number'}</p>
          )}

          <motion.button
            className="btn-glow w-full mt-6"
            whileTap={{ scale: 0.96 }}
            onClick={handlePhoneSubmit}
          >
            {t(locale, 'continueBtn')} ✨
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      <div className="app-header flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0"><Logo size="sm" /></div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
            {printsRemaining} {t(locale, 'remainingPrints')}
          </div>
        </div>
      </div>

      <div className="px-5 py-2 relative z-10 text-center">
        <h2 className="text-lg font-bold text-white">{event.name}</h2>
        <p className="text-sm text-white/50 mt-0.5">{event.date.replace(/-/g, '.')}</p>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-3 pb-6 relative z-10">
        <AnimatePresence mode="wait">
          {mode === 'choose' && !capturedImage && (
            <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4 items-center w-full max-w-sm">
              <motion.div className="w-28 h-28 mb-4 rounded-full bg-primary/10 flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="text-5xl">📷</span>
              </motion.div>
              <motion.button className="btn-glow w-full text-base" whileTap={{ scale: 0.96 }} onClick={() => setMode('camera')}>
                <span className="text-xl">📸</span> {t(locale, 'takePhoto')}
              </motion.button>
              <motion.button className="btn-secondary w-full text-base" whileTap={{ scale: 0.96 }}
                onClick={() => fileInputRef.current?.click()}>
                <span className="text-xl">🖼️</span> {t(locale, 'uploadPhoto')}
              </motion.button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </motion.div>
          )}

          {mode === 'camera' && !capturedImage && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-lg flex flex-col items-center gap-4">
              {/* Timer selector */}
              <div className="flex items-center gap-2" style={{ opacity: countdown !== null ? 0.4 : 1, pointerEvents: countdown !== null ? 'none' : 'auto' }}>
                <span className="text-xs text-white/50">{he ? 'טיימר:' : 'Timer:'}</span>
                {TIMER_OPTIONS.map((sec) => (
                  <button key={sec}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${timerSeconds === sec
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/60 active:bg-white/20'}`}
                    onClick={() => { setTimerSeconds(sec); cancelTimer(); }}>
                    {sec === 0 ? (he ? 'ללא' : 'Off') : `${sec}s`}
                  </button>
                ))}
              </div>

              <div className="camera-viewfinder camera-viewfinder-main w-full">
                <Webcam key={facingMode} ref={webcamRef} audio={false} screenshotFormat="image/jpeg" screenshotQuality={0.92}
                  videoConstraints={{ facingMode, width: { ideal: 1920 }, height: { ideal: 1440 } }}
                  className="w-full rounded-2xl" mirrored={facingMode === 'user'} />
                <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />

                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center rounded-2xl z-10"
                      style={{ background: 'rgba(0,0,0,0.4)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.span
                        key={countdown}
                        initial={{ scale: 2, opacity: 0 }}
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

              <div className="flex items-center justify-center gap-8">
                <button className="control-btn" onClick={() => { cancelTimer(); setMode('choose'); }}>✕</button>
                {countdown !== null ? (
                  <motion.button className="shutter-btn" whileTap={{ scale: 0.85 }} onClick={cancelTimer}
                    style={{ background: 'linear-gradient(135deg, #666, #888)' }}>
                    <span className="text-white text-2xl font-bold">■</span>
                  </motion.button>
                ) : (
                  <motion.button className="shutter-btn" whileTap={{ scale: 0.85 }} onClick={capture}>
                    <div className="shutter-btn-inner" />
                    {timerSeconds > 0 && (
                      <span className="absolute text-white text-xs font-bold">{timerSeconds}s</span>
                    )}
                  </motion.button>
                )}
                <button className="control-btn" disabled={countdown !== null} style={{ opacity: countdown !== null ? 0.4 : 1 }}
                  onClick={() => setFacingMode((f) => f === 'user' ? 'environment' : 'user')}>🔄</button>
              </div>
            </motion.div>
          )}

          {capturedImage && (
            <motion.div key="captured" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-md flex flex-col items-center gap-5">
              <div className="camera-viewfinder w-full">
                <img src={capturedImage} alt="Captured" className="w-full rounded-2xl" />
                <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />
              </div>
              <div className="flex items-center gap-3 w-full max-w-xs">
                <motion.button className="btn-secondary flex-1" whileTap={{ scale: 0.96 }}
                  onClick={() => { setCapturedImage(null); setMode('choose'); }}>
                  {t(locale, 'retake')}
                </motion.button>
                <motion.button className="btn-glow flex-1" whileTap={{ scale: 0.96 }} onClick={goToPreview}>
                  {t(locale, 'usePhoto')} ✨
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
