'use client';

import { motion } from 'framer-motion';

// A stylized rotating wireframe globe with orbiting "camera flash" dots —
// purely decorative, sits behind the Logo on the gateway page.
export default function SpinningGlobe({ size = 240 }: { size?: number }) {
  const r = size / 2;
  const longitudeAngles = [0, 30, 60, 90, 120, 150];
  const latitudeOffsets = [-0.62, -0.32, 0, 0.32, 0.62];

  return (
    <div className="relative flex items-center justify-center pointer-events-none" style={{ width: size, height: size }}>
      {/* soft ambient glow */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -size * 0.15,
          background: 'radial-gradient(circle, rgba(212,175,55,0.22), transparent 70%)',
        }}
      />

      {/* wireframe globe — slow continuous rotation */}
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx={r} cy={r} r={r - 3} fill="none" stroke="#D4AF37" strokeOpacity={0.4} strokeWidth={1.3} />
        {longitudeAngles.map((deg) => (
          <ellipse
            key={deg}
            cx={r}
            cy={r}
            rx={(r - 3) * 0.36}
            ry={r - 3}
            fill="none"
            stroke="#D4AF37"
            strokeOpacity={0.22}
            strokeWidth={1}
            transform={`rotate(${deg} ${r} ${r})`}
          />
        ))}
        {latitudeOffsets.map((t, i) => {
          const cy = r + t * (r - 3);
          const rx = Math.sqrt(Math.max(0, 1 - t * t)) * (r - 3);
          const ry = Math.max(2, (1 - Math.abs(t)) * 9);
          return (
            <ellipse key={i} cx={r} cy={cy} rx={rx} ry={ry} fill="none" stroke="#D4AF37" strokeOpacity={0.18} strokeWidth={1} />
          );
        })}
      </motion.svg>

      {/* orbiting camera-flash dots, each on its own rotating ring */}
      <motion.div
        className="absolute"
        style={{ inset: -10 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute rounded-full"
          style={{ width: 7, height: 7, top: 0, left: '50%', transform: 'translate(-50%, -2px)', background: '#F4E5B0', boxShadow: '0 0 10px 3px rgba(212,175,55,0.8)' }}
        />
      </motion.div>
      <motion.div
        className="absolute"
        style={{ inset: -22 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute rounded-full"
          style={{ width: 5, height: 5, top: '50%', right: 0, transform: 'translate(2px, -50%)', background: '#D4AF37', boxShadow: '0 0 8px 2px rgba(212,175,55,0.6)' }}
        />
      </motion.div>
      <motion.div
        className="absolute"
        style={{ inset: -34 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 21, repeat: Infinity, ease: 'linear' }}
      >
        <span className="absolute text-sm" style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 4px)' }}>
          📸
        </span>
      </motion.div>
    </div>
  );
}
