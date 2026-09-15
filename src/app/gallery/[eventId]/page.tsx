'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import LanguageToggle from '@/components/ui/LanguageToggle';
import HomeLogo from '@/components/ui/HomeLogo';
import Footer from '@/components/ui/Footer';
import ParticleBackground from '@/components/ui/ParticleBackground';

interface GalleryPhoto { id: string; createdAt: string; }
interface GalleryData { event: { id: string; name: string }; photos: GalleryPhoto[]; }

export default function EventGalleryPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const hydrated = useHydrated();
  const { locale } = useStore();
  const he = locale === 'he';
  const isRtl = locale === 'he';

  const [data, setData] = useState<GalleryData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  useEffect(() => {
    api.getEventGallery(eventId).then((d) => {
      setData(d);
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [eventId]);

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

  if (notFound || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5" dir={isRtl ? 'rtl' : 'ltr'}>
        <ParticleBackground />
        <LanguageToggle />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center max-w-sm relative z-10">
          <span className="text-5xl block mb-4">😕</span>
          <h2 className="text-xl font-bold text-white mb-3">
            {he ? 'הגלריה הזו לא נמצאה' : 'This gallery could not be found'}
          </h2>
          <p className="text-sm text-white/50">
            {he ? 'הקישור שגוי, או שהאירוע נמחק.' : "The link is wrong, or the event was deleted."}
          </p>
        </motion.div>
      </div>
    );
  }

  const lightboxPhoto = data.photos.find((p) => p.id === lightboxId) || null;

  return (
    <div className="min-h-dvh relative flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      <div className="app-header flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <HomeLogo size="lg" animate={false} />
        </div>
      </div>

      <motion.div
        className="px-5 py-4 relative z-10 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-xl font-bold text-white">{data.event.name}</h2>
        <p className="text-sm text-white/30 mt-0.5">
          {data.photos.length} {he ? 'תמונות' : 'photos'}
        </p>
      </motion.div>

      <main className="flex-1 px-3 pb-8 relative z-10">
        {data.photos.length === 0 ? (
          <div className="glass-card p-10 text-center max-w-sm mx-auto mt-6">
            <span className="text-5xl block mb-3">📸</span>
            <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין עדיין תמונות' : 'No photos yet'}</h3>
            <p className="text-sm text-white/40">
              {he ? 'תמונות שיצולמו באירוע יופיעו כאן' : 'Photos taken at this event will show up here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-4xl mx-auto">
            {data.photos.map((photo, i) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i, 20) * 0.03 }}
                onClick={() => setLightboxId(photo.id)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10"
              >
                <img
                  src={api.getPhotoImageUrl(photo.id)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </motion.button>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxId(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={api.getPhotoImageUrl(lightboxPhoto.id)}
              alt=""
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxId(null)}
              className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center"
              aria-label={he ? 'סגור' : 'Close'}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer compact />
    </div>
  );
}
