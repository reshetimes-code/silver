'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
    handleGoogleCredential?: (response: { credential: string }) => void;
  }
}

export default function LoginPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { locale } = useStore();
  const he = locale === 'he';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async (credential: string) => {
    setError('');
    try {
      setLoading(true);
      await api.googleAuth(credential);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    window.handleGoogleCredential = (response) => handleGoogleLogin(response.credential);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = api.getStoredToken();
    if (token) {
      api.getMe().then((u) => {
        if (u) router.push('/dashboard');
      });
    }
  }, [router]);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) { setError(he ? 'נא למלא את כל השדות' : 'Please fill in all fields'); return; }
    try {
      setLoading(true);
      await api.login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError('');
    if (!email || !password || !name) { setError(he ? 'נא למלא את כל השדות' : 'Please fill in all required fields'); return; }
    if (password.length < 6) { setError(he ? 'סיסמה חייבת להיות לפחות 6 תווים' : 'Password must be at least 6 characters'); return; }
    try {
      setLoading(true);
      await api.register({ email: email.trim(), password, name: name.trim(), phone: phone.trim() });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-dvh relative flex flex-col items-center justify-center px-5 bg-black" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      <ParticleBackground />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-6 sm:p-8 w-full max-w-sm relative z-10"
      >
        <div className="mb-5 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Tab toggle */}
        <div className="flex mb-5 rounded-xl overflow-hidden border border-white/10">
          <button
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-primary/20 text-[#F4E5B0]' : 'text-white/40'}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            {he ? 'התחברות' : 'Login'}
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${mode === 'register' ? 'bg-primary/20 text-[#F4E5B0]' : 'text-white/40'}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            {he ? 'הרשמה' : 'Register'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
          >
            {mode === 'register' && (
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={he ? 'שם מלא *' : 'Full Name *'}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] mb-3 text-sm" />
            )}

            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder={he ? 'אימייל *' : 'Email *'} autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] mb-3 text-sm" />

            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
              placeholder={he ? 'סיסמה *' : 'Password *'}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] mb-3 text-sm" />

            {mode === 'register' && (
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder={he ? 'טלפון (אופציונלי)' : 'Phone (optional)'} dir="ltr"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] mb-3 text-sm" />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mb-3 text-center">
            {error}
          </motion.p>
        )}

        <button
          className="btn-glow w-full mt-1"
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? (he ? 'רגע...' : 'Please wait...') : mode === 'login' ? (he ? 'התחבר' : 'Login') : (he ? 'צור חשבון' : 'Create Account')}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/25 text-xs">{he ? 'או' : 'or'}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google Sign-In */}
        <div
          id="g_id_onload"
          data-client_id="1007500230578-edkmhl9fu4r7ontgllor0p403sejkom6.apps.googleusercontent.com"
          data-callback="handleGoogleCredential"
          data-auto_prompt="false"
        />
        <div
          className="g_id_signin w-full"
          data-type="standard"
          data-shape="rectangular"
          data-theme="filled_black"
          data-text={he ? 'signin_with' : 'signin_with'}
          data-size="large"
          data-logo_alignment="left"
          data-width="100%"
        />

        <p className="text-center text-[10px] text-white/20 mt-4">
          {mode === 'login'
            ? (he ? 'חדש כאן? לחץ על הרשמה למעלה' : 'New here? Click Register above')
            : (he ? 'כבר יש לך חשבון? לחץ על התחברות' : 'Already have an account? Click Login above')}
        </p>
      </motion.div>

      {/* Back to landing */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 relative z-10">
        <Link href="/" className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
          ← {he ? 'חזרה לדף הראשי' : 'Back to home'}
        </Link>
      </motion.div>
    </div>
  );
}
