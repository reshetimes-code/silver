'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface OverlayRendererProps {
  overlayUrl: string;
  children?: React.ReactNode;
  photoUrl?: string;
  editable?: boolean;
  onPositionChange?: (position: { scale: number; x: number; y: number }) => void;
}

export default function OverlayRenderer({ overlayUrl, children, photoUrl, editable = false, onPositionChange }: OverlayRendererProps) {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!editable) return;
    if (e.touches.length === 1) {
      setDragging(true);
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [editable]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!editable) return;
    e.preventDefault();

    if (e.touches.length === 1 && lastTouch.current && dragging) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPosition(p => {
        const newPos = { x: p.x + dx, y: p.y + dy };
        onPositionChange?.({ scale, ...newPos });
        return newPos;
      });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current > 0) {
        const delta = dist / lastDist.current;
        setScale(s => {
          const newScale = Math.max(0.5, Math.min(3, s * delta));
          onPositionChange?.({ scale: newScale, ...position });
          return newScale;
        });
      }
      lastDist.current = dist;
    }
  }, [editable, dragging, scale, position, onPositionChange]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    lastTouch.current = null;
    lastDist.current = 0;
  }, []);

  const handleZoomIn = () => {
    setScale(s => {
      const newScale = Math.min(3, s + 0.15);
      onPositionChange?.({ scale: newScale, ...position });
      return newScale;
    });
  };

  const handleZoomOut = () => {
    setScale(s => {
      const newScale = Math.max(0.5, s - 0.15);
      onPositionChange?.({ scale: newScale, ...position });
      return newScale;
    });
  };

  const handleReset = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
    onPositionChange?.({ scale: 1.0, x: 0, y: 0 });
  };

  return (
    <div className="relative">
      <motion.div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        {/* PNG overlay defines the size */}
        <img
          src={overlayUrl}
          alt="Frame"
          className="relative w-full h-auto block z-10 pointer-events-none"
          draggable={false}
        />

        {/* Photo behind — with zoom/pan transforms */}
        <div
          className="absolute inset-0 z-0 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: editable ? 'none' : 'auto' }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Your photo"
              className="w-full h-full"
              style={{
                objectFit: 'cover',
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: dragging ? 'none' : 'transform 0.2s ease',
              }}
              draggable={false}
            />
          ) : children}
        </div>
      </motion.div>

      {/* Zoom controls — only when editable */}
      {editable && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={handleZoomOut}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold active:scale-90 transition-transform">
            −
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{Math.round(scale * 100)}%</span>
          </div>
          <button onClick={handleZoomIn}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold active:scale-90 transition-transform">
            +
          </button>
          <button onClick={handleReset}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white/60 active:scale-90 transition-transform">
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
