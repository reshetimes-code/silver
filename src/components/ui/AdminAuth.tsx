'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';
import ParticleBackground from './ParticleBackground';

const ADMIN_PASSWORD = 'silver2026';

export default function AdminAuth({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Check sessionStorage
  if (typeof window !== 'undefined' && !authenticated) {
    if (sessionStorage.getItem('admin-auth') === 'true') {
      setAuthenticated(true);
    }
  }

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('admin-auth', 'true');
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-dvh relative flex flex-col items-center justify-center px-5">
      <ParticleBackground />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-8 w-full max-w-sm relative z-10 text-center"
      >
        <div className="mb-6">
          <Logo size="md" />
        </div>

        <h2 className="text-lg font-bold text-white mb-1">Admin Panel</h2>
        <p className="text-xs text-white/40 mb-6">Enter password to continue</p>

        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="Password"
          className={`w-full px-4 py-3 rounded-xl bg-white/8 border text-white text-center text-lg tracking-widest placeholder-white/25 focus:outline-none mb-4 ${
            error ? 'border-red-500' : 'border-white/15 focus:border-primary'
          }`}
          autoFocus
        />

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mb-3">
            Wrong password
          </motion.p>
        )}

        <button className="btn-glow w-full" onClick={handleLogin}>
          Enter
        </button>
      </motion.div>
    </div>
  );
}
