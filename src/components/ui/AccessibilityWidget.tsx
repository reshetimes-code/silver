'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);
  const [linkHighlight, setLinkHighlight] = useState(false);

  const applyFontSize = (size: number) => {
    setFontSize(size);
    requestAnimationFrame(() => { document.documentElement.style.fontSize = `${size}%`; });
  };

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    requestAnimationFrame(() => { document.documentElement.classList.toggle('high-contrast', next); });
  };

  const toggleMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    requestAnimationFrame(() => { document.documentElement.classList.toggle('reduce-motion', next); });
  };

  const toggleCursor = () => {
    const next = !bigCursor;
    setBigCursor(next);
    requestAnimationFrame(() => { document.documentElement.classList.toggle('big-cursor', next); });
  };

  const toggleLinks = () => {
    const next = !linkHighlight;
    setLinkHighlight(next);
    requestAnimationFrame(() => { document.documentElement.classList.toggle('highlight-links', next); });
  };

  const resetAll = () => {
    setFontSize(100); setHighContrast(false); setReduceMotion(false); setBigCursor(false); setLinkHighlight(false);
    requestAnimationFrame(() => {
      document.documentElement.style.fontSize = '100%';
      document.documentElement.classList.remove('high-contrast', 'reduce-motion', 'big-cursor', 'highlight-links');
    });
  };

  return (
    <>
      {/* Accessibility Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
        whileTap={{ scale: 0.85 }}
        aria-label="Accessibility settings"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="4.5" r="2.5" />
          <path d="M12 7v5" />
          <path d="M7 9.5l5 2" />
          <path d="M17 9.5l-5 2" />
          <path d="M9 21l3-7" />
          <path d="M15 21l-3-7" />
        </svg>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Widget Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[rgba(212,175,55,0.15)] rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto"
              style={{ paddingBottom: 'calc(32px + var(--safe-bottom, 0px))' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Accessibility</h3>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60">✕</button>
              </div>

              <div className="space-y-4">
                {/* Font Size */}
                <div>
                  <p className="text-xs text-white/50 mb-2">Font Size</p>
                  <div className="flex gap-2">
                    {[
                      { label: 'A-', size: 85 },
                      { label: 'A', size: 100 },
                      { label: 'A+', size: 120 },
                      { label: 'A++', size: 140 },
                    ].map((opt) => (
                      <button key={opt.size}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${fontSize === opt.size ? 'bg-primary text-white' : 'bg-white/8 text-white/60 active:bg-white/15'}`}
                        onClick={() => applyFontSize(opt.size)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Options */}
                <ToggleOption label="High Contrast" description="Increase color contrast" active={highContrast} onToggle={toggleContrast} />
                <ToggleOption label="Reduce Motion" description="Stop animations" active={reduceMotion} onToggle={toggleMotion} />
                <ToggleOption label="Large Cursor" description="Bigger mouse pointer" active={bigCursor} onToggle={toggleCursor} />
                <ToggleOption label="Highlight Links" description="Underline all links" active={linkHighlight} onToggle={toggleLinks} />

                {/* Reset */}
                <button className="w-full py-3 rounded-xl bg-white/8 text-white/60 text-sm font-bold active:bg-white/15 transition-colors mt-2"
                  onClick={resetAll}>
                  Reset All
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ToggleOption({ label, description, active, onToggle }: { label: string; description: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${active ? 'bg-primary/15 border border-primary/30' : 'bg-white/5 border border-white/5'}`}
      onClick={onToggle}
    >
      <div className="text-left">
        <p className={`text-sm font-bold ${active ? 'text-primary' : 'text-white/80'}`}>{label}</p>
        <p className="text-[10px] text-white/40">{description}</p>
      </div>
      <div className={`w-10 h-6 rounded-full relative transition-colors ${active ? 'bg-primary' : 'bg-white/20'}`}>
        <motion.div
          className="w-5 h-5 bg-white rounded-full absolute top-0.5"
          animate={{ left: active ? '18px' : '2px' }}
          transition={{ type: 'spring', damping: 20 }}
        />
      </div>
    </button>
  );
}
