'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthProps {
  children: React.ReactNode;
  onUser?: (user: AuthUser) => void;
}

export default function AdminAuth({ children, onUser }: AdminAuthProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = api.getStoredToken();
    if (!token) {
      router.push('/login');
      return;
    }
    api.getMe().then((u) => {
      if (u) {
        setAuthenticated(true);
        onUser?.(u);
      } else {
        router.push('/login');
      }
      setLoading(false);
    }).catch(() => {
      router.push('/login');
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }}
        />
      </div>
    );
  }

  if (!authenticated) return null;

  return <>{children}</>;
}
