'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { api } from '@/lib/api';

/**
 * The app logo, everywhere it appears — including fully public guest pages.
 * It's a clickable shortcut straight to /admin, but ONLY once the current
 * viewer is confirmed as a logged-in super admin. For a guest, a regular
 * account holder, or before that check resolves, it's just a mark, not a
 * button — nothing to accidentally tap into mid-photo-session.
 *
 * Most viewers of any given page are guests with no stored token at all, so
 * this skips the network call entirely for them rather than probing on
 * every page load.
 */
export default function HomeLogo(props: { size?: 'sm' | 'md' | 'lg' | 'xl'; animate?: boolean }) {
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const token = api.getStoredToken();
    if (!token) return;
    api.getMe().then((u) => {
      if (u?.role === 'super_admin') setCanManage(true);
    }).catch(() => {});
  }, []);

  return canManage ? (
    <Link href="/admin"><Logo {...props} /></Link>
  ) : (
    <Logo {...props} />
  );
}
