'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface OverlayRendererProps {
  overlayUrl: string;
  children: React.ReactNode;
}

export default function OverlayRenderer({ overlayUrl, children }: OverlayRendererProps) {
  return (
    <motion.div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
    >
      {/* PNG overlay defines the size - it's the container */}
      <img
        src={overlayUrl}
        alt="Frame"
        className="relative w-full h-auto block z-10 pointer-events-none"
        draggable={false}
      />

      {/* Photo sits behind the PNG, exactly the same size */}
      <div className="absolute inset-0 z-0">
        {children}
      </div>
    </motion.div>
  );
}
