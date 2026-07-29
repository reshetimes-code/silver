'use client';

import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

const DIMENSIONS = {
  sm: 'h-12',
  md: 'h-20',
  lg: 'h-36 sm:h-44',
  xl: 'h-48 sm:h-56',
};

export default function Logo({ size = 'lg', animate = true }: LogoProps) {
  const imgClass = DIMENSIONS[size];

  if (animate) {
    return (
      <motion.div
        className="flex items-center justify-center"
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' as const }}
      >
        <img
          src="/logo_transperent.png"
          alt="Silver Photobooth"
          className={`${imgClass} w-auto object-contain`}
        />
      </motion.div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <img
        src="/logo_transperent.png"
        alt="Silver Photobooth"
        className={`${imgClass} w-auto object-contain`}
      />
    </div>
  );
}
