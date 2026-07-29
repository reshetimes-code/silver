'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function BottomNav() {
  const shareWhatsApp = () => {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `📸 Check out Silver Photobooth!\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' as const, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      <div
        className="mx-3 mb-3 rounded-2xl overflow-visible relative"
        style={{
          background: 'rgba(10, 10, 10, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212,175,55,0.12)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2.5 relative">
          {/* WhatsApp Share */}
          <button
            onClick={shareWhatsApp}
            className="flex flex-col items-center gap-0.5 px-3 py-1 active:scale-90 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(37,211,102,0.7)">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="text-[9px] font-bold" style={{ color: 'rgba(37,211,102,0.6)' }}>WhatsApp</span>
          </button>

          {/* Center — Camera / Landing */}
          <Link href="/login" className="-mt-7">
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, #C5963A, #D4AF37, #F4E5B0, #D4AF37)',
                boxShadow: '0 4px 20px rgba(212,175,55,0.4), 0 0 0 3px rgba(0,0,0,0.8), 0 0 0 5px rgba(212,175,55,0.2)',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <svg width="24" height="24" viewBox="0 0 80 80" fill="none">
                <rect x="28" y="12" width="18" height="8" rx="3" fill="rgba(0,0,0,0.5)" />
                <rect x="10" y="20" width="60" height="42" rx="8" fill="rgba(0,0,0,0.4)" />
                <circle cx="40" cy="41" r="13" fill="rgba(0,0,0,0.5)" />
                <circle cx="40" cy="41" r="9" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
              </svg>
            </motion.div>
            <p className="text-[8px] tracking-[0.15em] uppercase text-center mt-1 font-bold"
              style={{ color: 'rgba(212,175,55,0.5)' }}>
              Login
            </p>
          </Link>

          {/* Contact */}
          <Link href="/#contact"
            className="flex flex-col items-center gap-0.5 px-3 py-1 active:scale-90 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            <span className="text-[9px] font-bold" style={{ color: 'rgba(212,175,55,0.4)' }}>Contact</span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
