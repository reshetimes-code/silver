'use client';

import { motion } from 'framer-motion';

export default function Logo({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const imgClass = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24 sm:h-32',
  }[size];

  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring' }}
    >
      <img
        src="/logo.png"
        alt="Logo"
        className={`${imgClass} w-auto object-contain`}
      />
    </motion.div>
  );
}
