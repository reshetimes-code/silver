'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

const DIMENSIONS = {
  sm: { icon: 36, text: 'text-xs', sub: 'text-[7px]', gap: 'gap-0.5' },
  md: { icon: 64, text: 'text-2xl', sub: 'text-[9px]', gap: 'gap-1' },
  lg: { icon: 110, text: 'text-4xl sm:text-5xl', sub: 'text-xs sm:text-sm', gap: 'gap-2' },
  xl: { icon: 140, text: 'text-5xl sm:text-6xl', sub: 'text-sm sm:text-base', gap: 'gap-3' },
};

function LogoInner({ size = 'lg', animate = true, uid }: LogoProps & { uid: string }) {
  const d = DIMENSIONS[size];

  return (
    <>
      {/* Animated Camera Icon */}
      <div className="relative">
        {/* Glow ring */}
        {animate && (
          <motion.div
            className="absolute inset-[-12px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Camera SVG */}
        <motion.svg
          width={d.icon}
          height={d.icon}
          viewBox="0 0 80 80"
          fill="none"
          className="relative z-10"
          animate={animate ? { rotateY: [0, 10, 0, -10, 0] } : undefined}
          transition={animate ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          <defs>
            <linearGradient id={`${uid}-goldGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C5963A" />
              <stop offset="50%" stopColor="#F4E5B0" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
            <linearGradient id={`${uid}-lensGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="50%" stopColor="#16213e" />
              <stop offset="100%" stopColor="#0f3460" />
            </linearGradient>
            <filter id={`${uid}-glow`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="28" y="12" width="18" height="8" rx="3" fill={`url(#${uid}-goldGrad)`} opacity="0.9" />
          <rect x="10" y="20" width="60" height="42" rx="8" fill={`url(#${uid}-goldGrad)`} filter={`url(#${uid}-glow)`} />
          <rect x="13" y="23" width="54" height="36" rx="6" fill="rgba(0,0,0,0.15)" />
          <circle cx="40" cy="41" r="16" fill={`url(#${uid}-goldGrad)`} />
          <circle cx="40" cy="41" r="13" fill={`url(#${uid}-lensGrad)`} />
          <circle cx="40" cy="41" r="9" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
          <circle cx="40" cy="41" r="5" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />

          <motion.circle
            cx="35" cy="37" r="3" fill="rgba(255,255,255,0.3)"
            animate={animate ? { opacity: [0.2, 0.5, 0.2] } : undefined}
            transition={animate ? { duration: 2, repeat: Infinity } : undefined}
          />
          <motion.circle
            cx="58" cy="28" r="2.5" fill="#e94560"
            animate={animate ? { opacity: [1, 0.3, 1] } : undefined}
            transition={animate ? { duration: 1.5, repeat: Infinity } : undefined}
          />
          <rect x="17" y="26" width="8" height="5" rx="1.5" fill="rgba(0,0,0,0.3)" />
          <rect x="18" y="27" width="6" height="3" rx="1" fill="rgba(212,175,55,0.2)" />
        </motion.svg>

        {/* Flash animation */}
        {animate && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 60%)' }}
            animate={{ opacity: [0, 0, 0, 0, 1, 0], scale: [0.8, 0.8, 0.8, 0.8, 1.5, 2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col items-center">
        <motion.h1
          className={`${d.text} font-black tracking-[0.15em] leading-none`}
          animate={animate ? { backgroundPosition: ['0% center', '200% center'] } : undefined}
          transition={animate ? { duration: 4, repeat: Infinity, ease: 'linear' } : undefined}
          style={{
            background: 'linear-gradient(90deg, #C5963A, #D4AF37, #F4E5B0, #D4AF37, #C5963A, #D4AF37, #F4E5B0)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          PHOTOBOOTH
        </motion.h1>
        <motion.div
          className={`${d.sub} uppercase tracking-[0.4em] mt-1 font-medium`}
          style={{ color: 'rgba(212,175,55,0.4)' }}
          initial={animate ? { opacity: 0, letterSpacing: '0.1em' } : undefined}
          animate={animate ? { opacity: 1, letterSpacing: '0.4em' } : undefined}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          by Silver
        </motion.div>
      </div>
    </>
  );
}

export default function Logo({ size = 'lg', animate = true }: LogoProps) {
  const d = DIMENSIONS[size];
  const uid = useId().replace(/:/g, '');

  if (animate) {
    return (
      <motion.div
        className={`flex flex-col items-center justify-center ${d.gap}`}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, type: 'spring' as const, damping: 12 }}
      >
        <LogoInner size={size} animate uid={uid} />
      </motion.div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${d.gap}`}>
      <LogoInner size={size} animate={false} uid={uid} />
    </div>
  );
}
