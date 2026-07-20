'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';

export default function QRDisplayPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale, events } = useStore();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const event = events.find((e) => e.id === eventId);
  const he = locale === 'he';

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = `${window.location.origin}/event/${eventId}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400, margin: 2,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('QR failed:', err);
      }
    };
    generateQR();
  }, [eventId]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${event?.name || eventId}.png`;
    link.click();
  };

  if (!hydrated) return null;

  if (!event) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <span className="text-5xl block mb-3">😕</span>
          <h2 className="text-xl font-bold text-white">Event not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative flex flex-col items-center justify-center px-5 py-8">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Logo size="md" />
        </motion.div>

        {/* Event name */}
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-2xl sm:text-3xl font-black text-white mb-2">
          {event.name}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-sm text-white/50 mb-8">
          {event.date}
        </motion.p>

        {/* QR Code */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', damping: 12 }}
          className="bg-white rounded-3xl p-6 shadow-2xl mb-6"
        >
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 sm:w-80 sm:h-80" />
          ) : (
            <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-100 animate-pulse rounded-xl" />
          )}
        </motion.div>

        {/* Scan text */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-lg font-bold text-white mb-1">
          {he ? 'סרקו כדי לצלם!' : 'Scan to take photos!'}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="text-xs text-white/40 mb-8 break-all">
          {typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}` : ''}
        </motion.p>

        {/* Download button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="btn-secondary"
          onClick={handleDownload}
        >
          📥 {he ? 'הורד QR' : 'Download QR'}
        </motion.button>
      </div>
    </div>
  );
}
