'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import { showActionError, withErrorAlert } from '@/lib/errors';
import Swal from '@/lib/swal';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AuthUser { id: string; email: string; name: string; role: string; }
interface DropboxStatus { connected: boolean; accountEmail?: string; accountName?: string; rootFolderPath?: string | null; }
interface FolderEntry { name: string; path: string; }

export default function StoragePage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { locale } = useStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<DropboxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [currentPath, setCurrentPath] = useState(''); // '' = Dropbox root
  const [folders, setFolders] = useState<FolderEntry[] | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);

  const isRtl = locale === 'he';
  const he = locale === 'he';

  const loadStatus = useCallback(() => {
    return api.getDropboxStatus().then((s: DropboxStatus) => {
      setStatus(s);
      if (s.connected) setCurrentPath(s.rootFolderPath || '');
    });
  }, []);

  useEffect(() => {
    const token = api.getStoredToken();
    if (!token) {
      router.push('/login');
      return;
    }
    api.getMe().then((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);
      loadStatus().finally(() => setLoading(false));
    }).catch(() => router.push('/login'));
  }, [router, loadStatus]);

  // Show a toast for the OAuth callback's redirect result, then clean the URL.
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      Swal.fire({ icon: 'success', title: he ? '✅ דרופבוקס מחובר!' : '✅ Dropbox connected!', timer: 2000, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
      router.replace('/dashboard/storage');
    } else if (error) {
      Swal.fire({ icon: 'error', title: he ? 'החיבור לדרופבוקס נכשל' : 'Dropbox connection failed', text: he ? 'נסה שוב' : 'Please try again', background: '#0a0a0a', color: '#fff', confirmButtonColor: '#D4AF37' });
      router.replace('/dashboard/storage');
    }
  }, [hydrated, he, router]);

  const handleConnect = async () => {
    setConnecting(true);
    await withErrorAlert(async () => {
      const { url } = await api.getDropboxConnectUrl();
      window.location.href = url;
    });
    setConnecting(false);
  };

  const loadFolders = useCallback((path: string) => {
    setBrowsing(true);
    api.listDropboxFolders(path).then((data: { folders: FolderEntry[] }) => {
      setFolders(data.folders);
      setBrowsing(false);
    }).catch((err) => {
      setBrowsing(false);
      showActionError(err);
    });
  }, []);

  useEffect(() => {
    if (status?.connected) loadFolders(currentPath);
  }, [status?.connected, currentPath, loadFolders]);

  const crumbs = currentPath.split('/').filter(Boolean);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await withErrorAlert(async () => {
      const { path } = await api.createDropboxFolder(currentPath, name);
      setNewFolderName('');
      setShowNewFolder(false);
      setCurrentPath(path); // navigate straight into the new folder
    });
  };

  const handleSelectFolder = async () => {
    setSavingFolder(true);
    await withErrorAlert(async () => {
      await api.selectDropboxFolder(currentPath);
      await loadStatus();
      Swal.fire({ icon: 'success', title: he ? '✅ התיקייה נשמרה' : '✅ Folder saved', timer: 1500, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
    setSavingFolder(false);
  };

  const handleDisconnect = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: he ? 'לנתק את דרופבוקס?' : 'Disconnect Dropbox?',
      text: he ? 'תמונות אירועים חדשים יפסיקו להישלח לחשבון הזה' : 'New event photos will stop uploading to this account',
      showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333',
      confirmButtonText: he ? 'נתק' : 'Disconnect', cancelButtonText: he ? 'ביטול' : 'Cancel',
      background: '#0a0a0a', color: '#fff',
    });
    if (!result.isConfirmed) return;
    await withErrorAlert(async () => {
      await api.disconnectDropbox();
      setFolders(null);
      setCurrentPath('');
      await loadStatus();
    });
  };

  if (!hydrated || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-transparent" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative flex flex-col bg-black" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />

      <div className="app-header flex items-center justify-between relative z-20">
        <Link href="/dashboard"><Logo size="md" animate={false} /></Link>
        <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70 px-3 py-2">
          {he ? 'חזרה' : 'Back'}
        </Link>
      </div>

      <main className="flex-1 flex flex-col items-center px-5 py-4 relative z-10">
        <h3 className="text-center text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: 'rgba(212, 175, 55, 0.3)' }}>
          {he ? 'אחסון' : 'Storage'} {user?.name ? `· ${user.name}` : ''}
        </h3>
        <h2 className="text-xl font-bold text-white mb-5">{he ? 'חיבור לדרופבוקס' : 'Dropbox connection'}</h2>

        <div className="w-full max-w-sm space-y-4">
          {!status?.connected ? (
            <div className="glass-card p-6 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-white/60 text-sm mb-5">
                {he
                  ? 'חבר את חשבון הדרופבוקס שלך כדי שתמונות האירועים שלך יעלו ישירות אליו.'
                  : 'Connect your own Dropbox account so your event photos upload straight to it.'}
              </p>
              <button className="btn-glow w-full" onClick={handleConnect} disabled={connecting}>
                {connecting ? (he ? 'מעביר לדרופבוקס...' : 'Redirecting to Dropbox...') : (he ? 'התחבר לדרופבוקס' : 'Connect to Dropbox')}
              </button>
            </div>
          ) : (
            <>
              <div className="glass-card p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">{he ? 'מחובר בתור' : 'Connected as'}</p>
                <p className="text-white font-bold">{status.accountName}</p>
                <p className="text-white/40 text-sm">{status.accountEmail}</p>
                <div className="flex gap-2 mt-4">
                  <button className="btn-secondary flex-1 text-xs" onClick={handleConnect} disabled={connecting}>
                    {he ? 'החלף חשבון' : 'Change account'}
                  </button>
                  <button className="flex-1 text-xs text-red-400/70 hover:text-red-400 transition-colors" onClick={handleDisconnect}>
                    {he ? 'נתק' : 'Disconnect'}
                  </button>
                </div>
              </div>

              <div className="glass-card p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">
                  {he ? 'תיקיית יעד לתמונות' : 'Destination folder for photos'}
                </p>

                {status.rootFolderPath && (
                  <p className="text-xs text-white/40 mb-3">
                    {he ? 'תיקייה נוכחית: ' : 'Current folder: '}
                    <span className="text-white/70" dir="ltr">{status.rootFolderPath}</span>
                  </p>
                )}

                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-1 text-xs mb-3" dir="ltr">
                  <button className="text-primary hover:underline" onClick={() => setCurrentPath('')}>
                    {he ? 'ראשי' : 'Dropbox'}
                  </button>
                  {crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-white/20">/</span>
                      <button
                        className="text-primary hover:underline truncate max-w-[80px]"
                        onClick={() => setCurrentPath('/' + crumbs.slice(0, i + 1).join('/'))}
                      >
                        {c}
                      </button>
                    </span>
                  ))}
                </div>

                {/* Folder list */}
                <div className="max-h-56 overflow-y-auto rounded-xl bg-white/5 border border-white/10 mb-3">
                  {browsing ? (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} />
                    </div>
                  ) : folders && folders.length > 0 ? (
                    folders.map((f) => (
                      <button
                        key={f.path}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                        onClick={() => setCurrentPath(f.path)}
                      >
                        <span>📁</span>
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-white/30 text-xs py-6">{he ? 'אין תיקיות משנה כאן' : 'No subfolders here'}</p>
                  )}
                </div>

                {/* New folder */}
                <AnimatePresence>
                  {showNewFolder && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                      <div className="flex gap-2">
                        <input
                          type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder={he ? 'שם תיקייה חדשה' : 'New folder name'}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/8 border border-white/15 text-white text-sm placeholder-white/25 focus:outline-none focus:border-primary"
                        />
                        <button className="btn-glow text-xs px-3" onClick={handleCreateFolder}>{he ? 'צור' : 'Create'}</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 text-xs" onClick={() => setShowNewFolder((v) => !v)}>
                    + {he ? 'תיקייה חדשה' : 'New folder'}
                  </button>
                  <button
                    className="btn-glow flex-1 text-xs disabled:opacity-40"
                    onClick={handleSelectFolder}
                    disabled={savingFolder || !currentPath}
                    title={!currentPath ? (he ? 'בחר תיקייה, לא את הראשי' : 'Pick a folder, not the Dropbox root') : undefined}
                  >
                    {savingFolder ? (he ? 'שומר...' : 'Saving...') : (he ? 'בחר תיקייה זו' : 'Select this folder')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
