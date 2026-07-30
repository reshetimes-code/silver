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

const PHOTO_WIDTH = 1080;
const PHOTO_HEIGHT = 1920;

export default function CapturePhotoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale, getDevicePrintCount, guestPhone, setGuestPhone } = useStore();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'phone' | 'choose' | 'camera' | 'upload' | 'crop'>('phone');
  const [rawImage, setRawImage] = useState<string | null>(null); // before crop
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // after crop
  const [cropScale, setCropScale] = useState(1.0);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const cropDragRef = useRef<{ x: number; y: number } | null>(null);
  const cropPinchRef = useRef<number>(0);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  // Attach non-passive touch listeners for crop area
  useEffect(() => {
    const el = cropAreaRef.current;
    if (!el || mode !== 'crop') return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        cropDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        cropPinchRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && cropDragRef.current) {
        const dx = e.touches[0].clientX - cropDragRef.current.x;
        const dy = e.touches[0].clientY - cropDragRef.current.y;
        cropDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setCropPos(p => ({ x: p.x + dx, y: p.y + dy }));
      } else if (e.touches.length === 2 && cropPinchRef.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist / cropPinchRef.current;
        cropPinchRef.current = dist;
        setCropScale(s => Math.max(0.3, Math.min(3, s * delta)));
      }
    };
    const onTouchEnd = () => {
      cropDragRef.current = null;
      cropPinchRef.current = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [mode]);
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
    try {
      const video = webcamRef.current?.video;
      if (!video || !video.videoWidth) {
        const fallback = webcamRef.current?.getScreenshot();
        if (fallback) { setRawImage(fallback); setMode('crop'); }
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.min(1, 1920 / Math.max(vw, vh));
      const cw = Math.round(vw * scale);
      const ch = Math.round(vh * scale);

      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = cw;
      captureCanvas.height = ch;
      const ctx = captureCanvas.getContext('2d')!;

      if (facingMode === 'user') {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, cw, ch);

      const fullResImage = captureCanvas.toDataURL('image/jpeg', 0.95);
      setRawImage(fullResImage);
      setCropScale(1.0);
      setCropPos({ x: 0, y: 0 });
      setMode('crop');
    } catch (err) {
      console.error('Capture failed:', err);
      const fallback = webcamRef.current?.getScreenshot();
      if (fallback) { setRawImage(fallback); setMode('crop'); }
    }
  }, [facingMode]);

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
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      setRawImage(raw);
      setCropScale(1.0);
      setCropPos({ x: 0, y: 0 });
      setMode('crop');
    };
    reader.readAsDataURL(file);
  };

  const confirmCrop = useCallback(() => {
    if (!rawImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = PHOTO_WIDTH;
      canvas.height = PHOTO_HEIGHT;

      const srcW = img.width;
      const srcH = img.height;

      // Step 1: Blurred background — draw stretched image, then blur via OffscreenCanvas or direct
      // Simple approach: draw stretched cover as dark background
      const bgScale = Math.max(PHOTO_WIDTH / srcW, PHOTO_HEIGHT / srcH) * 1.3;
      const bgW = srcW * bgScale;
      const bgH = srcH * bgScale;

      // Draw the background (will act as blur-like fill)
      // First pass: draw small version then scale up for blur effect
      const blurCanvas = document.createElement('canvas');
      const blurSize = 20; // small = more blur
      blurCanvas.width = blurSize;
      blurCanvas.height = Math.round(blurSize * (PHOTO_HEIGHT / PHOTO_WIDTH));
      const blurCtx = blurCanvas.getContext('2d')!;
      blurCtx.drawImage(img, 0, 0, blurCanvas.width, blurCanvas.height);
      // Draw blurred bg
      ctx.globalAlpha = 0.5;
      ctx.drawImage(blurCanvas, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
      ctx.globalAlpha = 1.0;

      // Step 2: Draw actual photo with user's crop position + 5% soft edge fade
      const baseScale = Math.min(PHOTO_WIDTH / srcW, PHOTO_HEIGHT / srcH);
      const finalScale = baseScale * cropScale;
      const drawW = srcW * finalScale;
      const drawH = srcH * finalScale;
      const drawX = (PHOTO_WIDTH - drawW) / 2 + cropPos.x * (PHOTO_WIDTH / 400);
      const drawY = (PHOTO_HEIGHT - drawH) / 2 + cropPos.y * (PHOTO_HEIGHT / 700);

      // Draw photo into a temp canvas, apply 5% alpha fade to all 4 edges
      const photoCanvas = document.createElement('canvas');
      photoCanvas.width = Math.max(1, Math.round(drawW));
      photoCanvas.height = Math.max(1, Math.round(drawH));
      const photoCtx = photoCanvas.getContext('2d')!;
      photoCtx.drawImage(img, 0, 0, photoCanvas.width, photoCanvas.height);

      const fadeX = Math.round(photoCanvas.width * 0.15);
      const fadeY = Math.round(photoCanvas.height * 0.15);
      const imageData = photoCtx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
      const data = imageData.data;
      const pw = photoCanvas.width;
      const ph = photoCanvas.height;
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
          let a = 1.0;
          if (x < fadeX) a = Math.min(a, x / fadeX);
          if (x > pw - fadeX) a = Math.min(a, (pw - x) / fadeX);
          if (y < fadeY) a = Math.min(a, y / fadeY);
          if (y > ph - fadeY) a = Math.min(a, (ph - y) / fadeY);
          data[(y * pw + x) * 4 + 3] = Math.round(data[(y * pw + x) * 4 + 3] * a);
        }
      }
      photoCtx.putImageData(imageData, 0, 0);

      // Composite faded photo onto blurred background
      ctx.drawImage(photoCanvas, Math.round(drawX), Math.round(drawY));

      const result = canvas.toDataURL('image/jpeg', 0.92);

      // Save to session and go to preview
      try {
        sessionStorage.setItem('photobooth-captured-image', result);
        router.push(`/event/${eventId}/preview`);
      } catch {
        // If too large, compress
        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = 720;
        smallCanvas.height = 1280;
        smallCanvas.getContext('2d')!.drawImage(canvas, 0, 0, 720, 1280);
        sessionStorage.setItem('photobooth-captured-image', smallCanvas.toDataURL('image/jpeg', 0.85));
        router.push(`/event/${eventId}/preview`);
      }
    };
    img.src = rawImage;
  }, [rawImage, cropScale, cropPos, router, eventId]);

  const goToPreview = () => {
    if (!capturedImage) return;
    try {
      sessionStorage.setItem('photobooth-captured-image', capturedImage);
      router.push(`/event/${eventId}/preview`);
    } catch (err) {
      // sessionStorage full — compress and retry
      console.error('Storage full, compressing...', err);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.min(img.width, 1080);
        c.height = Math.round(c.width * (img.height / img.width));
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const compressed = c.toDataURL('image/jpeg', 0.85);
        try {
          sessionStorage.setItem('photobooth-captured-image', compressed);
          router.push(`/event/${eventId}/preview`);
        } catch {
          alert(he ? 'שגיאה בשמירת התמונה, נסה שוב' : 'Error saving photo, please try again');
        }
      };
      img.src = capturedImage;
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

      {/* ===== CAMERA FULLSCREEN (outside main to avoid z-index issues) ===== */}
      {mode === 'camera' && !capturedImage && (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="flex-1 relative overflow-hidden">
            <Webcam key={facingMode} ref={webcamRef} audio={false}
              screenshotFormat="image/jpeg" screenshotQuality={1}
              videoConstraints={{ facingMode, width: { ideal: 1920, min: 1280 }, height: { ideal: 1920, min: 1280 } }}
              className="absolute inset-0 w-full h-full object-cover"
              mirrored={facingMode === 'user'}
            />
            <div className="viewfinder-corner tl" /><div className="viewfinder-corner tr" />
            <div className="viewfinder-corner bl" /><div className="viewfinder-corner br" />

            {/* Top: timer */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)', opacity: countdown !== null ? 0.4 : 1, pointerEvents: countdown !== null ? 'none' : 'auto' }}>
              <div className="flex items-center gap-1.5">
                {TIMER_OPTIONS.map((sec) => (
                  <button key={sec}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-bold ${timerSeconds === sec ? 'bg-primary text-black' : 'bg-black/40 text-white/60'}`}
                    onClick={() => { setTimerSeconds(sec); cancelTimer(); }}>
                    {sec === 0 ? (he ? 'ללא' : 'Off') : `${sec}s`}
                  </button>
                ))}
              </div>
              <div className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-black/40 text-[#D4AF37]">
                {printsRemaining} {he ? 'נותרו' : 'left'}
              </div>
            </div>

            {/* Countdown */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center z-30" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <span className="countdown-number">{countdown}</span>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-center gap-8 py-5 px-4 bg-black">
            <button className="control-btn" onClick={() => { cancelTimer(); setMode('choose'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
            {countdown !== null ? (
              <button className="shutter-btn" onClick={cancelTimer} style={{ background: 'linear-gradient(135deg, #666, #888)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : (
              <button className="shutter-btn pulse-ring" onClick={capture}>
                <div className="shutter-btn-inner" />
                {timerSeconds > 0 && <span className="absolute text-black text-xs font-bold">{timerSeconds}s</span>}
              </button>
            )}
            <button className="control-btn" disabled={countdown !== null} style={{ opacity: countdown !== null ? 0.4 : 1 }}
              onClick={() => setFacingMode((f) => f === 'user' ? 'environment' : 'user')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ===== CROP SCREEN — adjust photo in 9:16 frame ===== */}
      {mode === 'crop' && rawImage && (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Header */}
          <div className="p-3 text-center">
            <p className="text-sm font-bold text-white">{he ? 'התאם את התמונה' : 'Adjust Your Photo'}</p>
            <p className="text-[10px] text-white/40">{he ? 'גרור להזיז • צבוט לזום' : 'Drag to move • Pinch to zoom'}</p>
          </div>

          {/* Crop area — 9:16 frame */}
          <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
            <div
              ref={cropAreaRef}
              className="relative w-full overflow-hidden rounded-2xl border border-white/20"
              style={{ aspectRatio: '9/16', maxHeight: '70vh', touchAction: 'none' }}
            >
              {/* Blurred background fill */}
              <img
                src={rawImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(30px) brightness(0.5)', transform: 'scale(1.2)' }}
                draggable={false}
              />
              {/* Actual photo — draggable/zoomable */}
              <img
                src={rawImage}
                alt="Your photo"
                className="absolute w-full h-full object-contain"
                style={{
                  transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />
              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none z-10"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: '33.33% 33.33%',
                }}
              />
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button onClick={() => setCropScale(s => Math.max(0.3, s - 0.1))}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl font-bold">−</button>
            <span className="text-xs text-white/40 w-12 text-center">{Math.round(cropScale * 100)}%</span>
            <button onClick={() => setCropScale(s => Math.min(3, s + 0.1))}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl font-bold">+</button>
            <button onClick={() => { setCropScale(1.0); setCropPos({ x: 0, y: 0 }); }}
              className="px-3 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white/50">Reset</button>
          </div>

          {/* Buttons */}
          <div className="px-5 pb-6 pt-2 flex items-center gap-3">
            <button className="btn-secondary flex-1" onClick={() => { setRawImage(null); setMode('choose'); }}>
              {t(locale, 'retake')}
            </button>
            <button className="btn-glow flex-1" onClick={confirmCrop}>
              {he ? 'אישור' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

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

          {/* Camera and captured views are rendered OUTSIDE main (above) */}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer compact />
    </div>
  );
}
