'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OverlayRendererProps {
  overlayUrl: string;
  children?: React.ReactNode;
  photoUrl?: string;
  editable?: boolean;
}

export default function OverlayRenderer({ overlayUrl, children, photoUrl, editable = false }: OverlayRendererProps) {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<number>(0);
  const photoAreaRef = useRef<HTMLDivElement>(null);

  // Non-passive touch listeners for drag/pinch
  useEffect(() => {
    const el = photoAreaRef.current;
    if (!el || !editable) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current) {
        const dx = e.touches[0].clientX - dragRef.current.x;
        const dy = e.touches[0].clientY - dragRef.current.y;
        dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
      } else if (e.touches.length === 2 && pinchRef.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist / pinchRef.current;
        pinchRef.current = dist;
        setScale(s => Math.max(0.5, Math.min(3, s * delta)));
      }
    };
    const onTouchEnd = () => { dragRef.current = null; pinchRef.current = 0; };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [editable]);

  return (
    <div className="relative">
      <motion.div
        className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        {/* PNG overlay — on top */}
        <img
          src={overlayUrl}
          alt="Frame"
          className="relative w-full h-auto block z-10 pointer-events-none"
          draggable={false}
        />

        {/* Photo area behind overlay */}
        <div
          ref={photoAreaRef}
          className="absolute inset-0 z-0 overflow-hidden bg-black"
          style={{ touchAction: editable ? 'none' : 'auto' }}
        >
          {photoUrl ? (
            <>
              {/* Layer 1: Blurred dark background */}
              <img
                src={photoUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                style={{
                  filter: 'blur(24px) brightness(0.3)',
                  transform: 'scale(1.08)',
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />

              {/* Layer 2: Main photo */}
              <img
                src={photoUrl}
                alt="Your photo"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />

              {/* Layer 3: Full vignette — 4 linear edges + 4 corner radials (user's approach) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: [
                    'linear-gradient(to top,    rgba(0,0,0,0.92) 0%, transparent 25%)',
                    'linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, transparent 25%)',
                    'linear-gradient(to left,   rgba(0,0,0,0.92) 0%, transparent 25%)',
                    'linear-gradient(to right,  rgba(0,0,0,0.92) 0%, transparent 25%)',
                    'radial-gradient(circle at top left,     rgba(0,0,0,0.92) 0%, transparent 40%)',
                    'radial-gradient(circle at top right,    rgba(0,0,0,0.92) 0%, transparent 40%)',
                    'radial-gradient(circle at bottom left,  rgba(0,0,0,0.92) 0%, transparent 40%)',
                    'radial-gradient(circle at bottom right, rgba(0,0,0,0.92) 0%, transparent 40%)',
                  ].join(', '),
                }}
              />
            </>
          ) : children}
        </div>
      </motion.div>

      {/* Zoom controls */}
      {editable && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.15))}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold active:scale-90"
          >−</button>
          <span className="text-xs text-white/40">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.15))}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold active:scale-90"
          >+</button>
          <button
            onClick={() => { setScale(1.0); setPosition({ x: 0, y: 0 }); }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white/60 active:scale-90"
          >Reset</button>
        </div>
      )}
    </div>
  );
}
