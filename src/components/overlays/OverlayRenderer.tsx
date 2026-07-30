'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OverlayRendererProps {
  overlayUrl: string;
  children?: React.ReactNode;
  photoUrl?: string;
  editable?: boolean;
}

/**
 * Creates a version of the image with faded edges using Canvas.
 * The edges gradually become transparent, revealing whatever is behind.
 */
function createFadedImage(src: string, callback: (dataUrl: string) => void) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const w = img.width;
    const h = img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Fade size as percentage of dimensions
    const fadeX = Math.round(w * 0.12);
    const fadeY = Math.round(h * 0.12);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        // Calculate fade factor for each edge (0 = fully faded, 1 = fully visible)
        let alphaFactor = 1;

        // Left edge
        if (x < fadeX) alphaFactor *= x / fadeX;
        // Right edge
        if (x > w - fadeX) alphaFactor *= (w - x) / fadeX;
        // Top edge
        if (y < fadeY) alphaFactor *= y / fadeY;
        // Bottom edge
        if (y > h - fadeY) alphaFactor *= (h - y) / fadeY;

        // Smooth curve (ease-in-out)
        alphaFactor = alphaFactor * alphaFactor * (3 - 2 * alphaFactor);

        // Apply to alpha channel
        data[idx + 3] = Math.round(data[idx + 3] * alphaFactor);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    callback(canvas.toDataURL('image/png'));
  };
  img.src = src;
}

export default function OverlayRenderer({ overlayUrl, children, photoUrl, editable = false }: OverlayRendererProps) {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [fadedPhotoUrl, setFadedPhotoUrl] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<number>(0);
  const photoAreaRef = useRef<HTMLDivElement>(null);

  // Create faded version of photo
  useEffect(() => {
    if (photoUrl) {
      createFadedImage(photoUrl, (url) => setFadedPhotoUrl(url));
    }
  }, [photoUrl]);

  // Non-passive touch listeners
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
        {/* PNG overlay */}
        <img src={overlayUrl} alt="Frame" className="relative w-full h-auto block z-10 pointer-events-none" draggable={false} />

        {/* Photo behind */}
        <div
          ref={photoAreaRef}
          className="absolute inset-0 z-0 overflow-hidden"
          style={{ touchAction: editable ? 'none' : 'auto' }}
        >
          {photoUrl ? (
            <>
              {/* Blur fill background */}
              <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(30px) brightness(0.5) saturate(1.3)', transform: 'scale(1.3)' }} draggable={false} />
              {/* Faded photo — edges are transparent, blending into blur bg */}
              {fadedPhotoUrl && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                  }}>
                  <img src={fadedPhotoUrl} alt="Your photo" className="w-full h-full object-contain" draggable={false} />
                </div>
              )}
            </>
          ) : children}
        </div>
      </motion.div>

      {/* Zoom controls */}
      {editable && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.15))}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold active:scale-90">−</button>
          <span className="text-xs text-white/40">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.15))}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold active:scale-90">+</button>
          <button onClick={() => { setScale(1.0); setPosition({ x: 0, y: 0 }); }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white/60 active:scale-90">Reset</button>
        </div>
      )}
    </div>
  );
}
