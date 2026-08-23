'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';


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

  // Check for google_failed error from redirect callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'google_failed' || params.get('error') === 'invalid_token') {
      setError(he ? 'כניסה עם Google נכשלה' : 'Google sign-in failed');
    }
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

        {/* Google Sign-In — redirect flow (avoids COOP issues) */}
        <button
          onClick={() => {
            const clientId = '1007500230578-edkmhl9fu4r7ontgllor0p403sejkom6.apps.googleusercontent.com';
            const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/google/callback`);
            const scope = encodeURIComponent('email profile');
            const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&prompt=select_account&access_type=offline`;
            window.location.href = url;
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {he ? 'כניסה עם Google' : 'Sign in with Google'}
        </button>

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
