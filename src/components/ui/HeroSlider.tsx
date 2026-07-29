'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Local images in /public/slides — originally from Unsplash (free license)
const SLIDES = [
  { url: '/slides/slide1.jpg', alt: 'Friends posing with party props' },
  { url: '/slides/slide2.jpg', alt: 'People celebrating with confetti' },
  { url: '/slides/slide3.jpg', alt: 'Colorful party balloons' },
  { url: '/slides/slide4.jpg', alt: 'Friends having fun at celebration' },
  { url: '/slides/slide5.jpg', alt: 'Group selfie at event' },
  { url: '/slides/slide6.jpg', alt: 'Crowd celebration with lights' },
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
      {/* Images with crossfade + ken burns */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1.02 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <motion.img
            src={SLIDES[currentIndex].url}
            alt={SLIDES[currentIndex].alt}
            className="w-full h-full object-cover"
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
            animate={{ scale: [1.02, 1.08] }}
            transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlay — smooth fade to black at bottom */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `linear-gradient(180deg,
            rgba(0,0,0,0.35) 0%,
            rgba(0,0,0,0.05) 30%,
            rgba(0,0,0,0.25) 60%,
            rgba(0,0,0,0.9) 88%,
            rgba(0,0,0,1) 100%
          )`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)' }}
      />

      {/* Top gold shimmer */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gold-shimmer z-20" />

      {/* Bottom gold line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] z-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }}
      />

      {/* "Silver Photobooth" badge */}
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

      {/* Slide indicators */}
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
