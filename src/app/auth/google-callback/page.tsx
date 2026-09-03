'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Read token from cookie set by the API route
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (token) {
        localStorage.setItem('auth-token', token);
        // Clear the cookie
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }

      // Super admins manage every event, so they land in the admin panel;
      // everyone else lands on their own "my events" dashboard.
      const user = await api.getMe();
      router.replace(user?.role === 'super_admin' ? '/admin' : '/dashboard');
    })();
  }, [router]);

  return (
    <div className="min-h-dvh bg-black flex items-center justify-center">
      <div className="text-white/40 text-sm">מתחבר...</div>
    </div>
  );
}
