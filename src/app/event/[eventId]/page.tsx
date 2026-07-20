'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { getDeviceId } from '@/lib/device-id';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Webcam from 'react-webcam';

export default function CapturePhotoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale, events, getDevicePrintCount } = useStore();

  const [mode, setMode] = useState<'choose' | 'camera' | 'upload'>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const event = events.find((e) => e.id === eventId);
  const isRtl = locale === 'he';

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setCapturedImage(imageSrc);
  }, []);

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

  if (!hydrated) return null;

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
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center max-w-sm relative z-10"
        >
          <span className="text-5xl block mb-4">🚫</span>
          <h2 className="text-xl font-bold text-white mb-3">{t(locale, 'noPrintsLeft')}</h2>
          <p className="text-sm text-white/50">{t(locale, 'maxPrintsReached')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      {/* App Header */}
      <div className="app-header flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
            {printsRemaining} {t(locale, 'remainingPrints')}
          </div>
        </div>
      </div>

      {/* Event name bar */}
      <div className="px-5 py-3 relative z-10">
        <h2 className="text-lg font-bold text-white text-center">{event.name}</h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-8 relative z-10">
        <AnimatePresence mode="wait">

          {/* ====== CHOOSE MODE ====== */}
          {mode === 'choose' && !capturedImage && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4 items-center w-full max-w-sm"
            >
              {/* Camera illustration */}
              <motion.div
                className="w-28 h-28 mb-4 rounded-full bg-primary/10 flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-5xl">📷</span>
              </motion.div>

              <motion.button
                className="btn-glow w-full text-base"
                whileTap={{ scale: 0.96 }}
                onClick={() => setMode('camera')}
              >
                <span className="text-xl">📸</span>
                {t(locale, 'takePhoto')}
              </motion.button>

              <motion.button
                className="btn-secondary w-full text-base"
                whileTap={{ scale: 0.96 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-xl">🖼️</span>
                {t(locale, 'uploadPhoto')}
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </motion.div>
          )}

          {/* ====== CAMERA MODE ====== */}
          {mode === 'camera' && !capturedImage && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md flex flex-col items-center gap-5"
            >
              {/* Camera viewfinder */}
              <div className="camera-viewfinder w-full">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.92}
                  videoConstraints={{
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 960 },
                  }}
                  className="w-full rounded-2xl"
                  mirrored={facingMode === 'user'}
                />
                <div className="viewfinder-corner tl" />
                <div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" />
                <div className="viewfinder-corner br" />
              </div>

              {/* Camera controls */}
              <div className="flex items-center justify-center gap-8">
                {/* Back */}
                <button
                  className="control-btn"
                  onClick={() => setMode('choose')}
                >
                  ✕
                </button>

                {/* Shutter */}
                <motion.button
                  className="shutter-btn"
                  whileTap={{ scale: 0.85 }}
                  onClick={capture}
                >
                  <div className="shutter-btn-inner" />
                </motion.button>

                {/* Flip camera */}
                <button
                  className="control-btn"
                  onClick={() => setFacingMode((f) => f === 'user' ? 'environment' : 'user')}
                >
                  🔄
                </button>
              </div>
            </motion.div>
          )}

          {/* ====== CAPTURED PREVIEW ====== */}
          {capturedImage && (
            <motion.div
              key="captured"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md flex flex-col items-center gap-5"
            >
              <div className="camera-viewfinder w-full">
                <img src={capturedImage} alt="Captured" className="w-full rounded-2xl" />
                <div className="viewfinder-corner tl" />
                <div className="viewfinder-corner tr" />
                <div className="viewfinder-corner bl" />
                <div className="viewfinder-corner br" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 w-full max-w-xs">
                <motion.button
                  className="btn-secondary flex-1"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setCapturedImage(null);
                    setMode('choose');
                  }}
                >
                  {t(locale, 'retake')}
                </motion.button>

                <motion.button
                  className="btn-glow flex-1"
                  whileTap={{ scale: 0.96 }}
                  onClick={goToPreview}
                >
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
