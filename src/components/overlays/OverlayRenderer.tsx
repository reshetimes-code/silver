'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface OverlayRendererProps {
  overlayUrl: string; // PNG overlay image URL
  children: React.ReactNode; // The photo underneath
}

export default function OverlayRenderer({ overlayUrl, children }: OverlayRendererProps) {
  return (
    <motion.div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
    >
      {/* Photo layer - underneath */}
      <div className="relative w-full">
        {children}
      </div>

      {/* PNG Overlay - on top, absolute positioned */}
      <img
        src={overlayUrl}
        alt="Overlay"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        draggable={false}
      />
    </motion.div>
  );
}
