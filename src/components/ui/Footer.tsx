'use client';

import { motion } from 'framer-motion';

export default function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="relative z-10 py-2 text-center">
        <p className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.2)' }}>
          Silver Photobooth
        </p>
      </footer>
    );
  }

  return (
    <motion.footer
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.6 }}
      className="relative z-10 mt-auto"
    >
      {/* Bottom navigation bar - app style */}
      <div
        className="relative mx-4 mb-4 rounded-2xl overflow-visible"
        style={{
          background: 'rgba(15, 15, 15, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212,175,55,0.12)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-around px-4 py-3 relative">
          {/* Left item */}
          <div className="flex flex-col items-center gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="14" rx="3" />
              <circle cx="12" cy="13" r="4" />
              <path d="M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6" />
            </svg>
            <span className="text-[9px] tracking-wider uppercase" style={{ color: 'rgba(212,175,55,0.3)' }}>Capture</span>
          </div>

          {/* Center - Big Logo Button (raised) */}
          <div className="relative -mt-10">
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, #C5963A, #D4AF37, #F4E5B0, #D4AF37)',
                boxShadow: '0 4px 20px rgba(212,175,55,0.4), 0 0 0 4px rgba(0,0,0,0.8), 0 0 0 6px rgba(212,175,55,0.2)',
              }}
              animate={{
                boxShadow: [
                  '0 4px 20px rgba(212,175,55,0.4), 0 0 0 4px rgba(0,0,0,0.8), 0 0 0 6px rgba(212,175,55,0.2)',
                  '0 4px 30px rgba(212,175,55,0.6), 0 0 0 4px rgba(0,0,0,0.8), 0 0 0 8px rgba(212,175,55,0.3)',
                  '0 4px 20px rgba(212,175,55,0.4), 0 0 0 4px rgba(0,0,0,0.8), 0 0 0 6px rgba(212,175,55,0.2)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Camera icon inside */}
              <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
                <rect x="28" y="12" width="18" height="8" rx="3" fill="rgba(0,0,0,0.6)" />
                <rect x="10" y="20" width="60" height="42" rx="8" fill="rgba(0,0,0,0.5)" />
                <circle cx="40" cy="41" r="13" fill="rgba(0,0,0,0.6)" />
                <circle cx="40" cy="41" r="9" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
              </svg>
            </motion.div>

            {/* Brand name under the button */}
            <p className="text-[8px] tracking-[0.25em] uppercase text-center mt-1.5 font-bold whitespace-nowrap"
              style={{ color: 'rgba(212,175,55,0.5)' }}>
              PHOTOBOOTH
            </p>
          </div>

          {/* Right item */}
          <div className="flex flex-col items-center gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth="1.5">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span className="text-[9px] tracking-wider uppercase" style={{ color: 'rgba(212,175,55,0.3)' }}>Print</span>
          </div>
        </div>
      </div>

      {/* Copyright line */}
      <p className="text-center text-[9px] tracking-widest uppercase pb-2" style={{ color: 'rgba(255,255,255,0.08)' }}>
        &copy; {new Date().getFullYear()} Silver
      </p>
    </motion.footer>
  );
}
