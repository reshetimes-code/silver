'use client';

import { motion } from 'framer-motion';

// Photobooth-style decorative elements floating in background
const PHOTO_FRAMES = [
  { x: '5%', y: '8%', rotate: -12, delay: 0, size: 70 },
  { x: '75%', y: '5%', rotate: 8, delay: 0.3, size: 65 },
  { x: '85%', y: '35%', rotate: 15, delay: 0.6, size: 55 },
  { x: '8%', y: '55%', rotate: -8, delay: 0.9, size: 60 },
  { x: '70%', y: '65%', rotate: 20, delay: 1.2, size: 50 },
  { x: '15%', y: '82%', rotate: -15, delay: 0.4, size: 45 },
  { x: '60%', y: '85%', rotate: 5, delay: 0.7, size: 55 },
  { x: '40%', y: '12%', rotate: -5, delay: 1.0, size: 48 },
];

function PolaroidFrame({ x, y, rotate, delay, size }: typeof PHOTO_FRAMES[0]) {
  const innerH = size * 0.65;
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.5, rotate: rotate - 20 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{ delay: delay + 0.5, duration: 1.2, type: 'spring', damping: 15 }}
    >
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [rotate, rotate + 2, rotate] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size,
          height: size + 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 4,
          padding: 4,
          paddingBottom: 16,
          backdropFilter: 'blur(4px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Photo area with gradient */}
        <div
          style={{
            width: '100%',
            height: innerH,
            borderRadius: 2,
            background: `linear-gradient(${135 + rotate}deg, rgba(212,175,55,0.06), rgba(15,52,96,0.08), rgba(212,175,55,0.04))`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Camera icon inside */}
          <svg
            viewBox="0 0 24 24"
            width={size * 0.3}
            height={size * 0.3}
            fill="none"
            stroke="rgba(212,175,55,0.12)"
            strokeWidth="1"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <rect x="2" y="6" width="20" height="14" rx="3" />
            <circle cx="12" cy="13" r="4" />
            <path d="M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6" />
          </svg>

          {/* Shimmer overlay */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.05), transparent)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['-200% center', '200% center'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: delay * 2 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Floating camera flash effects
function FlashDot({ delay, x, y }: { delay: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0, 0.6, 0],
        scale: [0.5, 0.5, 1.2, 0.5],
      }}
      transition={{ duration: 4, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#F4E5B0',
          boxShadow: '0 0 12px rgba(244,229,176,0.4), 0 0 24px rgba(212,175,55,0.2)',
        }}
      />
    </motion.div>
  );
}

export default function PhotoboothBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Polaroid frames scattered */}
      {PHOTO_FRAMES.map((frame, i) => (
        <PolaroidFrame key={i} {...frame} />
      ))}

      {/* Flash dots */}
      <FlashDot delay={1} x="20%" y="30%" />
      <FlashDot delay={2.5} x="80%" y="20%" />
      <FlashDot delay={4} x="50%" y="70%" />
      <FlashDot delay={3} x="10%" y="60%" />
      <FlashDot delay={5} x="90%" y="50%" />

      {/* Diagonal film strip decoration */}
      <motion.div
        className="absolute"
        style={{
          top: '15%',
          right: '-5%',
          width: 30,
          height: '35%',
          background: 'rgba(212,175,55,0.02)',
          border: '1px solid rgba(212,175,55,0.04)',
          borderRadius: 4,
          transform: 'rotate(12deg)',
        }}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        {/* Film holes */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 1,
              background: 'rgba(0,0,0,0.3)',
              margin: '12px auto',
            }}
          />
        ))}
      </motion.div>

      {/* Second film strip left side */}
      <motion.div
        className="absolute"
        style={{
          bottom: '10%',
          left: '-3%',
          width: 25,
          height: '30%',
          background: 'rgba(212,175,55,0.015)',
          border: '1px solid rgba(212,175,55,0.03)',
          borderRadius: 4,
          transform: 'rotate(-8deg)',
        }}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.8, duration: 1 }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 1,
              background: 'rgba(0,0,0,0.3)',
              margin: '10px auto',
            }}
          />
        ))}
      </motion.div>

      {/* Ambient light spots */}
      <div className="disco-lights" />
      <div className="disco-light-extra" />
    </div>
  );
}
