'use client';

import { motion } from 'framer-motion';

export default function Logo({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const config = {
    sm: { container: 'gap-2', icon: 'w-7 h-7', text: 'text-lg', leading: 'leading-[1.1]' },
    md: { container: 'gap-2.5', icon: 'w-10 h-10', text: 'text-3xl', leading: 'leading-[1.1]' },
    lg: { container: 'gap-3', icon: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-4xl sm:text-6xl', leading: 'leading-[1.05]' },
  }[size];

  return (
    <motion.div
      className={`flex items-center justify-center ${config.container}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring' }}
    >
      {/* Camera Icon */}
      <motion.div
        className={`${config.icon} relative flex-shrink-0`}
        animate={{ rotate: [0, -3, 3, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="16" width="56" height="40" rx="6" fill="#1a1a2e" stroke="#e94560" strokeWidth="2.5" />
          <circle cx="32" cy="36" r="13" fill="none" stroke="#0f3460" strokeWidth="3" />
          <circle cx="32" cy="36" r="9" fill="none" stroke="#e94560" strokeWidth="2" />
          <circle cx="32" cy="36" r="4" fill="#e94560" opacity="0.4" />
          <motion.circle cx="32" cy="36" r="2.5" fill="#FFFFFF"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }} />
          <rect x="22" y="10" width="20" height="10" rx="3" fill="#1a1a2e" stroke="#0f3460" strokeWidth="1.5" />
          <rect x="46" y="20" width="8" height="4" rx="1" fill="#FFD700" opacity="0.7" />
        </svg>
      </motion.div>

      {/* Text */}
      <div className={`flex flex-col items-start ${config.leading}`}>
        <span
          className={`${config.text} font-black tracking-tighter`}
          style={{
            background: 'linear-gradient(135deg, #e94560, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          PHOTO
        </span>
        <span
          className={`${config.text} font-black tracking-tighter`}
          style={{
            background: 'linear-gradient(135deg, #0f3460, #2196F3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          BOOTH
        </span>
      </div>
    </motion.div>
  );
}
