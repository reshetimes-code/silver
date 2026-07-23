'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Unsplash free images — photobooth / party props / photo strips theme
const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28?w=800&q=80&auto=format',
    alt: 'Friends posing with party props',
  },
  {
    url: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&q=80&auto=format',
    alt: 'People celebrating at party with confetti',
  },
  {
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80&auto=format',
    alt: 'Colorful party balloons and decorations',
  },
  {
    url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80&auto=format',
    alt: 'Friends having fun at celebration',
  },
  {
    url: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&q=80&auto=format',
    alt: 'Group selfie at event',
  },
  {
    url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format',
    alt: 'Crowd celebration with lights',
  },
];

const INTERVAL = 4500;

export default function HeroSlider() {
  const [[currentIndex, direction], setSlide] = useState([0, 1]);

  const nextSlide = useCallback(() => {
    setSlide(([prev]) => [(prev + 1) % SLIDES.length, 1]);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, INTERVAL);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="relative w-full h-[42vh] sm:h-[48vh] overflow-hidden rounded-b-[28px]">
      {/* Images with crossfade */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 1.0, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img
            src={SLIDES[currentIndex].url}
            alt={SLIDES[currentIndex].alt}
            className="w-full h-full object-cover"
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlay — bottom fade into black */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `
            linear-gradient(180deg,
              rgba(0,0,0,0.4) 0%,
              rgba(0,0,0,0.05) 35%,
              rgba(0,0,0,0.3) 65%,
              rgba(0,0,0,0.95) 92%,
              rgba(0,0,0,1) 100%
            )
          `,
        }}
      />

      {/* Gold vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)',
        }}
      />

      {/* Top gold shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gold-shimmer z-20" />

      {/* Bottom gold line transition */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] z-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }}
      />

      {/* "PHOTOBOOTH" badge floating on slider */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,175,55,0.25)',
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring' as const }}
      >
        <svg width="18" height="18" viewBox="0 0 80 80" fill="none">
          <rect x="28" y="12" width="18" height="8" rx="3" fill="#D4AF37" opacity="0.8" />
          <rect x="10" y="20" width="60" height="42" rx="8" fill="#D4AF37" />
          <rect x="13" y="23" width="54" height="36" rx="6" fill="rgba(0,0,0,0.2)" />
          <circle cx="40" cy="41" r="13" fill="#1a1a2e" />
        </svg>
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#D4AF37' }}>
          Silver Photobooth
        </span>
      </motion.div>

      {/* Slide indicators — pill style */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide([i, i > currentIndex ? 1 : -1])}
          >
            <motion.div
              className="h-[3px] rounded-full"
              animate={{
                width: i === currentIndex ? 22 : 6,
                background: i === currentIndex
                  ? 'linear-gradient(90deg, #C5963A, #F4E5B0)'
                  : 'rgba(255,255,255,0.25)',
              }}
              transition={{ duration: 0.3 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
