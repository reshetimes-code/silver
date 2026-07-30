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
 * Creates a composited image: blur background + centered photo with faded edges.
 * Everything baked into ONE image — guaranteed to show fade.
 */
function createCompositedPhoto(src: string, containerW: number, containerH: number, callback: (dataUrl: string) => void) {
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = containerW;
      canvas.height = containerH;
      const ctx = canvas.getContext('2d')!;

      // 1. Draw BLUR BACKGROUND — stretch image to fill, then simulate blur with small→large
      const tinyCanvas = document.createElement('canvas');
      const tinySize = 15;
      tinyCanvas.width = tinySize;
      tinyCanvas.height = Math.round(tinySize * (containerH / containerW));
      const tinyCtx = tinyCanvas.getContext('2d')!;
      tinyCtx.drawImage(img, 0, 0, tinyCanvas.width, tinyCanvas.height);

      // Draw tiny image scaled up = blur effect
      ctx.globalAlpha = 0.6;
      ctx.drawImage(tinyCanvas, 0, 0, containerW, containerH);
      ctx.globalAlpha = 1.0;

      // 2. Calculate photo position (contain — fit inside with aspect ratio)
      const imgRatio = img.width / img.height;
      const containerRatio = containerW / containerH;
      let drawW: number, drawH: number;

      if (imgRatio > containerRatio) {
        drawW = containerW * 0.92;
        drawH = drawW / imgRatio;
      } else {
        drawH = containerH * 0.92;
        drawW = drawH * imgRatio;
      }
      const drawX = (containerW - drawW) / 2;
      const drawY = (containerH - drawH) / 2;

      // 3. Draw photo with FADED EDGES using a temporary canvas with alpha gradient
      const photoCanvas = document.createElement('canvas');
      photoCanvas.width = Math.round(drawW);
      photoCanvas.height = Math.round(drawH);
      const photoCtx = photoCanvas.getContext('2d')!;
      photoCtx.drawImage(img, 0, 0, photoCanvas.width, photoCanvas.height);

      // Apply fade to edges
      const fadePixelsX = Math.round(photoCanvas.width * 0.15);
      const fadePixelsY = Math.round(photoCanvas.height * 0.15);
      const imageData = photoCtx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
      const data = imageData.data;
      const pw = photoCanvas.width;
      const ph = photoCanvas.height;

      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
          let a = 1;
          if (x < fadePixelsX) a *= x / fadePixelsX;
          if (x > pw - fadePixelsX) a *= (pw - x) / fadePixelsX;
          if (y < fadePixelsY) a *= y / fadePixelsY;
          if (y > ph - fadePixelsY) a *= (ph - y) / fadePixelsY;
          // Smooth
          a = a * a * (3 - 2 * a);
          const idx = (y * pw + x) * 4;
          data[idx + 3] = Math.round(data[idx + 3] * a);
        }
      }
      photoCtx.putImageData(imageData, 0, 0);

      // 4. Draw faded photo onto main canvas
      ctx.drawImage(photoCanvas, Math.round(drawX), Math.round(drawY));

      callback(canvas.toDataURL('image/jpeg', 0.92));
    } catch (err) {
      console.error('Composite failed:', err);
      callback(src);
    }
  };
  img.onerror = () => callback(src);
  img.src = src;
}

export default function OverlayRenderer({ overlayUrl, children, photoUrl, editable = false }: OverlayRendererProps) {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<number>(0);
  const photoAreaRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);

  // Create composited photo (blur bg + faded photo) when overlay loads
  useEffect(() => {
    if (!photoUrl) return;

    const overlayImg = overlayRef.current;
    if (overlayImg && overlayImg.complete && overlayImg.naturalWidth > 0) {
      createCompositedPhoto(photoUrl, overlayImg.naturalWidth, overlayImg.naturalHeight, setCompositeUrl);
    }
  }, [photoUrl]);

  const handleOverlayLoad = () => {
    if (!photoUrl || !overlayRef.current) return;
    createCompositedPhoto(photoUrl, overlayRef.current.naturalWidth, overlayRef.current.naturalHeight, setCompositeUrl);
  };

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
        <img ref={overlayRef} src={overlayUrl} alt="Frame" className="relative w-full h-auto block z-10 pointer-events-none"
          draggable={false} onLoad={handleOverlayLoad} />

        {/* Photo behind — composited with blur bg + faded edges */}
        <div
          ref={photoAreaRef}
          className="absolute inset-0 z-0 overflow-hidden"
          style={{ touchAction: editable ? 'none' : 'auto' }}
        >
          {compositeUrl ? (
            <img src={compositeUrl} alt="Your photo" className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
              draggable={false} />
          ) : photoUrl ? (
            <img src={photoUrl} alt="Your photo" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
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
