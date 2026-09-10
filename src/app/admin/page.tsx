'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from '@/lib/swal';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Logo from '@/components/ui/Logo';
import AdminAuth from '@/components/ui/AdminAuth';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';
import { showActionError, withErrorAlert } from '@/lib/errors';

/* ===================== BRANDED LOADER ===================== */
function BrandedLoader({ message }: { message: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      >
        {/* Outer spinning ring */}
        <div className="relative flex items-center justify-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute w-28 h-28 rounded-full"
            style={{ border: '2px solid transparent', borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute w-20 h-20 rounded-full"
            style={{ border: '1px solid transparent', borderTopColor: 'rgba(212,175,55,0.4)', borderLeftColor: 'rgba(212,175,55,0.4)' }}
          />
          {/* Camera icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="14" rx="3" />
              <circle cx="12" cy="13" r="4" />
              <path d="M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6" />
            </svg>
          </motion.div>
        </div>

        {/* PHOTO BOOTH text */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center"
        >
          <p className="text-xs tracking-[0.3em] text-[#D4AF37]/60 uppercase mb-1">PHOTO BOOTH</p>
          <p className="text-sm font-bold text-white/80">{message}</p>
        </motion.div>

        {/* Animated dots */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* hook: show loader only after 2s delay */
function useLoader() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
    setMessage(null);
  }, []);

  // Runs fn() under the loader and guarantees stop() fires even on failure
  // (a bare start()/await/stop() left the loader on-screen forever if the
  // awaited call threw), and surfaces any failure via withErrorAlert instead
  // of leaving the user staring at a spinner with no explanation.
  const run = useCallback(async <T,>(msg: string, fn: () => Promise<T>): Promise<T | undefined> => {
    start(msg);
    try {
      return await withErrorAlert(fn);
    } finally {
      stop();
    }
  }, [start, stop]);

  return { visible, message, start, stop, run };
}

type Tab = 'events' | 'overlays' | 'photos' | 'users' | 'leads';

interface AuthUser { id: string; email: string; name: string; role: string; }
interface EventData { id: string; name: string; date: string; maxPrintsPerDevice: number; active: boolean; ownerId?: string | null; owner?: { id: string; name: string; email: string }; }
interface OverlayData { id: string; name: string; url: string; }
interface PhotoData { id: string; eventId: string; photoUrl: string; overlayId: string | null; deviceId: string; phoneNumber: string; moderationStatus: string; moderationReason: string | null; printStatus: string; createdAt: string; event?: EventData; overlay?: OverlayData; }
interface UserData { id: string; email: string; name: string; role: string; active: boolean; phone: string; createdAt: string; _count: { events: number }; }
interface LeadData { id: string; name: string; phone: string; eventDate: string; handled: boolean; sourceEventId: string | null; ownerId: string | null; createdAt: string; owner?: { name: string; email: string } | null; sourceEvent?: { name: string } | null; }

export default function AdminPage() {
  const hydrated = useHydrated();
  const { locale } = useStore();
  const [tab, setTab] = useState<Tab>('events');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const isRtl = locale === 'he';
  const he = locale === 'he';

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Read ?tab= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t && ['events', 'overlays', 'photos', 'users', 'leads'].includes(t)) {
      setTab(t as Tab);
    }
  }, []);

  if (!hydrated) return null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'events', label: he ? 'אירועים' : 'Events', icon: '🎉' },
    { id: 'overlays', label: he ? 'מסגרות' : 'Overlays', icon: '🖼️' },
    { id: 'photos', label: he ? 'תמונות' : 'Photos', icon: '📸' },
    { id: 'leads', label: he ? 'לידים' : 'Leads', icon: '💎' },
    ...(isSuperAdmin ? [{ id: 'users' as Tab, label: he ? 'משתמשים' : 'Users', icon: '👥' }] : []),
  ];

  const handleLogout = () => {
    api.logout();
    window.location.reload();
  };

  return (
    <AdminAuth onUser={(u) => setCurrentUser(u)}>
    <div className="min-h-dvh relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />
      {/* Big centered logo — only navigates (self-link, back to /admin) for
          super admins; a no-op mark for a regular account manager viewing
          their own scoped admin panel. */}
      <div className="pt-6 pb-4 flex flex-col items-center relative z-10">
        {isSuperAdmin ? (
          <Link href="/admin"><Logo size="xl" animate={false} /></Link>
        ) : (
          <Logo size="xl" animate={false} />
        )}
        <div className="flex items-center gap-3 mt-3">
          {currentUser && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: isSuperAdmin ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.08)', color: isSuperAdmin ? '#D4AF37' : 'rgba(255,255,255,0.5)' }}>
              {currentUser.name} • {isSuperAdmin ? (he ? 'מנהל אתר' : 'Super Admin') : (he ? 'מנהל חשבון' : 'Account Manager')}
            </span>
          )}
          <button onClick={handleLogout} className="text-white/30 text-xs hover:text-white/60 transition-colors px-2 py-1 rounded-full bg-white/5">
            {he ? 'התנתק' : 'Logout'}
          </button>
        </div>
      </div>
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-lg border-b border-[rgba(212,175,55,0.1)]">
        <div className="flex max-w-3xl mx-auto">
          {tabs.map((tb) => (
            <button key={tb.id}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all relative ${tab === tb.id ? 'text-primary' : 'text-white/40'}`}
              onClick={() => setTab(tb.id)}>
              <span className="text-base block mb-0.5">{tb.icon}</span>
              {tb.label}
              {tab === tb.id && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>
      <div className="relative z-10 px-4 pb-24 pt-4 max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'events' && <EventsTab key="events" isSuperAdmin={isSuperAdmin} />}
          {tab === 'overlays' && <OverlaysTab key="overlays" />}
          {tab === 'photos' && <PhotosTab key="photos" />}
          {tab === 'leads' && <LeadsTab key="leads" />}
          {tab === 'users' && isSuperAdmin && <UsersTab key="users" currentUserId={currentUser?.id} />}
        </AnimatePresence>
      </div>
    </div>
    </AdminAuth>
  );
}

// ===================== EVENTS TAB =====================
function EventsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { locale, showLanguageToggle, setShowLanguageToggle } = useStore();
  const he = locale === 'he';
  const [events, setEvents] = useState<EventData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [maxPrints, setMaxPrints] = useState(5);
  const [ownerId, setOwnerId] = useState(''); // '' = myself (the creating super admin)
  const [managers, setManagers] = useState<UserData[]>([]);
  const [errors, setErrors] = useState<{ name?: boolean; date?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const loader = useLoader();

  const loadEvents = () => {
    api.getEvents().then((data) => { setEvents(data); setLoading(false); }).catch((err) => {
      setLoading(false);
      showActionError(err);
    });
  };

  useEffect(() => { loadEvents(); }, []);

  // The owner picker (whose Dropbox account an event's photos route to) only
  // matters — and is only allowed — for super admins.
  useEffect(() => {
    if (!isSuperAdmin) return;
    api.getUsers().then((data: UserData[]) => setManagers(data.filter((u) => u.role === 'account_manager'))).catch(() => {});
  }, [isSuperAdmin]);

  const resetForm = () => {
    setName(''); setDate(''); setMaxPrints(5); setOwnerId(''); setShowForm(false); setEditingId(null); setErrors({});
  };

  const handleSave = async () => {
    const errs = { name: !name.trim(), date: !date };
    setErrors(errs);
    if (errs.name || errs.date) {
      Swal.fire({ icon: 'warning', title: he ? 'שדות חסרים' : 'Missing Fields', text: he ? 'נא למלא שם אירוע ותאריך' : 'Please fill in event name and date', background: '#0a0a0a', color: '#fff', confirmButtonColor: '#D4AF37' });
      return;
    }
    await loader.run(editingId ? (he ? 'שומר שינויים...' : 'Saving changes...') : (he ? 'יוצר אירוע...' : 'Creating event...'), async () => {
      const ownerData = isSuperAdmin && ownerId ? { ownerId } : {};
      if (editingId) {
        await api.updateEvent(editingId, { name, date, maxPrintsPerDevice: maxPrints, ...ownerData });
      } else {
        await api.createEvent({ name, date, maxPrintsPerDevice: maxPrints, ...ownerData });
      }
      resetForm();
      loadEvents();
      Swal.fire({ icon: 'success', title: he ? '✅ נשמר בהצלחה!' : '✅ Saved!', text: editingId ? (he ? 'האירוע עודכן' : 'Event updated') : (he ? `האירוע "${name}" נוצר` : `Event "${name}" created`), timer: 2000, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  const startEdit = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setName(ev.name); setDate(ev.date); setMaxPrints(ev.maxPrintsPerDevice); setOwnerId(ev.owner?.id || '');
    setEditingId(id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ev = events.find(e => e.id === id);
    const result = await Swal.fire({ icon: 'warning', title: he ? 'למחוק אירוע?' : 'Delete event?', text: he ? `"${ev?.name}" וכל התמונות שלו יימחקו לצמיתות` : `"${ev?.name}" and all its photos will be permanently deleted`, showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק' : 'Delete', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#0a0a0a', color: '#fff' });
    if (!result.isConfirmed) return;
    await loader.run(he ? 'מוחק אירוע...' : 'Deleting event...', async () => {
      await api.deleteEvent(id);
      loadEvents();
      Swal.fire({ icon: 'success', title: he ? '🗑️ נמחק!' : '🗑️ Deleted!', timer: 1500, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await loader.run(active ? (he ? 'מכבה אירוע...' : 'Deactivating...') : (he ? 'מפעיל אירוע...' : 'Activating...'), async () => {
      await api.updateEvent(id, { active: !active });
      loadEvents();
      Swal.fire({ icon: 'success', title: !active ? (he ? '✅ האירוע הופעל' : '✅ Event activated') : (he ? '⏸ האירוע כובה' : '⏸ Event deactivated'), timer: 1500, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {loader.visible && loader.message && <BrandedLoader message={loader.message} />}
      {/* Language toggle switch */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white/80">Show Language Button</p>
          <p className="text-xs text-white/40">Show/hide HEB/ENG toggle for guests</p>
        </div>
        <button
          className={`w-12 h-7 rounded-full relative transition-colors ${showLanguageToggle ? 'bg-primary' : 'bg-white/20'}`}
          onClick={() => setShowLanguageToggle(!showLanguageToggle)}
        >
          <motion.div
            className="w-5.5 h-5.5 bg-white rounded-full absolute top-[3px]"
            style={{ width: 22, height: 22 }}
            animate={{ left: showLanguageToggle ? '22px' : '3px' }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </button>
      </div>

      <button className="btn-glow w-full mb-5" onClick={() => { resetForm(); setShowForm(true); }}>
        + {he ? 'אירוע חדש' : 'New Event'}
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 mb-5 overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4">{editingId ? (he ? 'ערוך אירוע' : 'Edit Event') : (he ? 'אירוע חדש' : 'New Event')}</h3>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs mb-1 ${errors.name ? 'text-red-400' : 'text-white/50'}`}>{he ? 'שם האירוע' : 'Event Name'} *</label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
                  className={`w-full px-4 py-3 rounded-xl bg-white/8 border text-white placeholder-white/25 focus:outline-none text-base ${errors.name ? 'border-red-500' : 'border-white/15 focus:border-primary'}`}
                  placeholder={he ? 'בר מצווה, Sweet 16...' : 'Bar Mitzvah, Sweet 16...'} />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${errors.date ? 'text-red-400' : 'text-white/50'}`}>{he ? 'תאריך' : 'Date'} *</label>
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: false })); }}
                  className={`w-full px-4 py-3 rounded-xl bg-white/8 border text-white focus:outline-none text-base ${errors.date ? 'border-red-500' : 'border-white/15 focus:border-primary'}`} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">{he ? 'מקסימום הדפסות' : 'Max Prints'}</label>
                <input type="number" value={maxPrints} onChange={(e) => setMaxPrints(parseInt(e.target.value) || 1)} min={1} max={50}
                  className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none text-base" />
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">{he ? 'מנהל האירוע (בעל התיקייה בדרופבוקס)' : 'Event manager (Dropbox owner)'}</label>
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none text-base">
                    <option value="">{he ? '— אני —' : '— Myself —'}</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-white/25 mt-1">
                    {he ? 'תמונות האירוע יעלו לדרופבוקס של המנהל שנבחר, אם חיבר אחד' : "Photos upload to the chosen manager's own Dropbox, if they've connected one"}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button className="btn-secondary flex-1" onClick={resetForm}>{he ? 'ביטול' : 'Cancel'}</button>
                <button className="btn-glow flex-1" onClick={handleSave}>{he ? 'שמור' : 'Save'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {events.map((event, i) => (
          <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-transparent" />
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">{event.name}</h3>
                  <p className="text-xs text-white/40">{event.date.replace(/-/g, '.')}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${event.active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                  {event.active ? (he ? 'פעיל' : 'Active') : (he ? 'כבוי' : 'Off')}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary active:bg-primary/25"
                  onClick={() => setShowQR(showQR === event.id ? null : event.id)}>QR</button>
                <Link href={`/admin/event/${event.id}/qr`} className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-400 active:bg-purple-500/25">
                  {he ? 'עמוד QR' : 'QR Page'}
                </Link>
                <Link href={`/event/${event.id}`} className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-green-500/15 text-green-400 active:bg-green-500/25">
                  {he ? 'כניסה' : 'Enter'} 🚀
                </Link>
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 active:bg-blue-500/25"
                  onClick={() => startEdit(event.id)}>{he ? 'ערוך' : 'Edit'}</button>
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-white/8 text-white/60 active:bg-white/15"
                  onClick={() => handleToggle(event.id, event.active)}>{event.active ? '⏸' : '▶️'}</button>
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 active:bg-red-500/25"
                  onClick={() => handleDelete(event.id)}>🗑️</button>
              </div>
              <AnimatePresence>
                {showQR === event.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-4 bg-white rounded-2xl text-center overflow-hidden">
                    <QRCodeDisplay eventId={event.id} />
                    <p className="text-xs text-gray-400 mt-2 break-all select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/event/${event.id}` : ''}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
        {events.length === 0 && (
          <div className="glass-card p-10 text-center">
            <span className="text-5xl block mb-3">🎉</span>
            <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין אירועים עדיין' : 'No events yet'}</h3>
            <p className="text-sm text-white/40">{he ? 'צור אירוע ראשון!' : 'Create your first event!'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===================== OVERLAYS TAB =====================
function OverlaysTab() {
  const { locale } = useStore();
  const he = locale === 'he';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [overlays, setOverlays] = useState<(OverlayData & { eventId?: string | null })[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [uploadEventId, setUploadEventId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const loader = useLoader();

  const loadData = () => {
    Promise.all([api.getOverlays(), api.getEvents()]).then(([ovs, evs]) => {
      setOverlays(ovs);
      setEvents(evs);
      setLoading(false);
    }).catch((err) => {
      setLoading(false);
      showActionError(err);
    });
  };

  useEffect(() => { loadData(); }, []);

  // Check if current user is super admin
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || '{}') : {};
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    // Resize PNG before upload (size limit) — capped to the print canvas size
    // so frames aren't upscaled/blurred when composited at full resolution.
    const resizeFile = (file: File): Promise<File> => new Promise((resolve) => {
      const MAX_W = 1240, MAX_H = 1844;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name, { type: 'image/png' }) : file);
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });

    await loader.run(he ? `מעלה ${files.length} מסגרות...` : `Uploading ${files.length} frame${files.length > 1 ? 's' : ''}...`, async () => {
      let uploaded = 0;
      for (let i = 0; i < files.length; i++) {
        const file = await resizeFile(files[i]);
        const name = files[i].name.replace(/\.[^.]+$/, '');
        // uploadEventId === '' means "global" (usable by every event's guests)
        await api.uploadOverlay(file, name, uploadEventId || undefined);
        uploaded++;
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
      Swal.fire({
        icon: 'success',
        title: he ? '✅ הועלה בהצלחה!' : '✅ Uploaded!',
        text: he ? `${uploaded} מסגרות נוספו למערכת` : `${uploaded} frame${uploaded > 1 ? 's' : ''} added successfully`,
        timer: 2500, showConfirmButton: false,
        background: '#0a0a0a', color: '#fff',
      });
    });
    setUploading(false);
  };

  const handleReassignOverlay = async (overlayId: string, newEventId: string) => {
    await withErrorAlert(async () => {
      await api.updateOverlay(overlayId, { eventId: newEventId || null });
      setOverlays((prev) => prev.map((o) => o.id === overlayId ? { ...o, eventId: newEventId || null } : o));
    });
  };

  const handleDeleteOverlay = async (id: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: he ? 'למחוק מסגרת?' : 'Delete overlay?',
      text: he ? 'פעולה זו לא ניתנת לביטול' : 'This cannot be undone',
      showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333',
      confirmButtonText: he ? 'מחק' : 'Delete', cancelButtonText: he ? 'ביטול' : 'Cancel',
      background: '#0a0a0a', color: '#fff',
    });
    if (!result.isConfirmed) return;
    await loader.run(he ? 'מוחק מסגרת...' : 'Deleting frame...', async () => {
      await api.deleteOverlay(id);
      loadData();
      Swal.fire({ icon: 'success', title: he ? 'נמחק!' : 'Deleted!', timer: 1500, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} /></div>;

  const visibleOverlays = selectedEventId === ''
    ? overlays
    : selectedEventId === '__global__'
      ? overlays.filter((o) => !o.eventId)
      : overlays.filter((o) => o.eventId === selectedEventId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {loader.visible && loader.message && <BrandedLoader message={loader.message} />}

      {/* Upload — pick which event this frame belongs to, or leave as global
          (available to every event's guests) */}
      <div className="glass-card p-3 mb-3">
        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">
          {he ? 'שייך לאירוע' : 'Assign to event'}
        </label>
        <select
          value={uploadEventId}
          onChange={(e) => setUploadEventId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
        >
          <option value="" className="bg-[#111]">{he ? '🌐 גלובלי — זמין לכל האירועים' : '🌐 Global — available to every event'}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id} className="bg-[#111]">{ev.name}</option>
          ))}
        </select>
      </div>

      <input ref={fileInputRef} type="file" accept="image/png" multiple className="hidden" onChange={handleUpload} />
      <button
        className="btn-glow w-full mb-5"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '⏳' : '+'} {he ? 'העלה מסגרות PNG' : 'Upload PNG Frames'}
      </button>

      {/* Filter the list below by event */}
      {overlays.length > 0 && (
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
        >
          <option value="" className="bg-[#111]">{he ? 'כל המסגרות' : 'All frames'}</option>
          <option value="__global__" className="bg-[#111]">{he ? 'גלובליות בלבד' : 'Global only'}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id} className="bg-[#111]">{ev.name}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleOverlays.map((overlay, i) => (
          <motion.div key={overlay.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
            className="glass-card overflow-hidden relative">
            <div className="aspect-[3/4] relative">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-conic-gradient(#0a0a0a 0% 25%, #1a1a1a 0% 50%)',
                backgroundSize: '12px 12px',
              }} />
              <img src={api.getOverlayImageUrl(overlay.id)} alt={overlay.name} className="relative w-full h-full object-contain p-1" loading="lazy" />
            </div>
            <div className="p-2">
              <p className="text-xs font-bold text-white/70 truncate">{overlay.name}</p>
              <select
                value={overlay.eventId || ''}
                onChange={(e) => handleReassignOverlay(overlay.id, e.target.value)}
                className="w-full mt-1.5 px-1.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[10px] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="" className="bg-[#111]">{he ? '🌐 גלובלי' : '🌐 Global'}</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-[#111]">{ev.name}</option>
                ))}
              </select>
              <div className="flex justify-end mt-1.5">
                <button className="w-6 h-6 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-xs active:bg-red-500/30"
                  onClick={() => handleDeleteOverlay(overlay.id)}>✕</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {overlays.length === 0 && (
        <div className="glass-card p-10 text-center">
          <span className="text-5xl block mb-3">🖼️</span>
          <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין מסגרות עדיין' : 'No frames yet'}</h3>
          <p className="text-sm text-white/40">{he ? 'העלה קבצי PNG' : 'Upload PNG files'}</p>
        </div>
      )}

      {overlays.length > 0 && visibleOverlays.length === 0 && (
        <div className="glass-card p-10 text-center">
          <span className="text-5xl block mb-3">🔍</span>
          <p className="text-sm text-white/40">{he ? 'אין מסגרות בסינון הזה' : 'No frames match this filter'}</p>
        </div>
      )}
    </motion.div>
  );
}

// ===================== PHOTOS TAB =====================
function PhotosTab() {
  const { locale } = useStore();
  const he = locale === 'he';
  const [events, setEvents] = useState<EventData[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sendingToPrint, setSendingToPrint] = useState(false);

  const loadEvents = async () => {
    try {
      const evs = await api.getEvents();
      setEvents(evs);
      // Get counts per event without loading all photo data
      const counts: Record<string, number> = {};
      for (const ev of evs) {
        const photos = await api.getPhotos(ev.id);
        counts[ev.id] = photos.length;
      }
      setPhotoCounts(counts);
    } catch (err) {
      showActionError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  const openGallery = async (eventId: string) => {
    setSelectedEventId(eventId);
    setLoadingPhotos(true);
    setSelectedIds(new Set());
    try {
      const p = await api.getPhotos(eventId);
      setPhotos(p);
    } catch (err) {
      showActionError(err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleSendToPrint = async () => {
    if (selectedIds.size === 0) return;
    const result = await Swal.fire({ icon: 'question', title: he ? `לשלוח ${selectedIds.size} תמונות להדפסה?` : `Send ${selectedIds.size} photos to print?`, text: he ? 'התמונות יישלחו לדרופבוקס' : 'Photos will be sent to Dropbox', showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333', confirmButtonText: he ? 'שלח' : 'Send', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#0a0a0a', color: '#fff' });
    if (!result.isConfirmed) return;
    setSendingToPrint(true);
    await withErrorAlert(async () => {
      const res = await api.sendToPrint(Array.from(selectedIds));
      if (res.sent > 0) {
        setPhotos((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, printStatus: 'sent' } : p));
        setSelectedIds(new Set());
        Swal.fire({ icon: 'success', title: he ? `${res.sent} תמונות נשלחו להדפסה!` : `${res.sent} photos sent to print!`, timer: 2000, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
      }
      if (res.failed > 0) {
        Swal.fire({ icon: 'error', title: he ? `${res.failed} תמונות נכשלו` : `${res.failed} photos failed`, text: he ? 'בדוק הגדרות דרופבוקס' : 'Check Dropbox settings', background: '#0a0a0a', color: '#fff', confirmButtonColor: '#D4AF37' });
      }
    });
    setSendingToPrint(false);
  };

  const handleApprovePhoto = async (photoId: string) => withErrorAlert(async () => {
    await api.updatePhoto(photoId, { moderationStatus: 'approved' });
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, moderationStatus: 'approved' } : p));
  });

  const handleRejectPhoto = async (photoId: string) => withErrorAlert(async () => {
    await api.updatePhoto(photoId, { moderationStatus: 'rejected' });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  });

  const handleDeletePhoto = async (photoId: string) => {
    const result = await Swal.fire({ icon: 'warning', title: he ? 'למחוק תמונה?' : 'Delete photo?', showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק' : 'Delete', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#0a0a0a', color: '#fff' });
    if (!result.isConfirmed) return;
    await withErrorAlert(async () => {
      await api.deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setPhotoCounts((prev) => ({ ...prev, [selectedEventId!]: (prev[selectedEventId!] || 1) - 1 }));
    });
  };

  const handleDeleteAllPhotos = async () => {
    if (!selectedEventId) return;
    const result = await Swal.fire({ icon: 'error', title: he ? 'למחוק את כל התמונות?' : 'Delete ALL photos?', text: he ? 'פעולה זו לא ניתנת לביטול!' : 'This action cannot be undone!', showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק הכל' : 'Delete All', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#0a0a0a', color: '#fff' });
    if (!result.isConfirmed) return;
    await withErrorAlert(async () => {
      await api.deleteEventPhotos(selectedEventId);
      setPhotos([]);
      setPhotoCounts((prev) => ({ ...prev, [selectedEventId]: 0 }));
      Swal.fire({ icon: 'success', title: he ? 'כל התמונות נמחקו' : 'All photos deleted', timer: 1500, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  const handleDownloadAll = async () => {
    for (const photo of photos) {
      const link = document.createElement('a');
      link.href = api.getPhotoImageUrl(photo.id);
      link.download = `photo_${photo.id.slice(0, 8)}.jpg`;
      link.target = '_blank';
      link.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} /></div>;

  // ===== GALLERY VIEW =====
  if (selectedEventId) {
    const event = events.find((e) => e.id === selectedEventId);
    const pendingReview = photos.filter((p) => p.moderationStatus === 'pending_review');
    const approvedPhotos = photos.filter((p) => p.moderationStatus === 'approved');

    if (loadingPhotos) return <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} /></div>;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <button className="text-sm text-white/50 mb-3 active:text-white" onClick={() => setSelectedEventId(null)}>
          ← {he ? 'חזרה לאירועים' : 'Back to events'}
        </button>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{event?.name}</h3>
            <p className="text-xs text-white/40">{photos.length} {he ? 'תמונות' : 'photos'}</p>
          </div>
        </div>

        {/* Pending review section */}
        {pendingReview.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-bold text-yellow-400 mb-2">⚠️ {he ? `${pendingReview.length} תמונות ממתינות לאישור` : `${pendingReview.length} photos pending review`}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pendingReview.map((photo) => (
                <div key={photo.id} className="glass-card overflow-hidden border border-yellow-500/30">
                  <div className="relative bg-black">
                    <img src={api.getPhotoImageUrl(photo.id)} alt="" className="w-full object-contain" loading="lazy" />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-yellow-500/80 text-xs font-bold text-black">
                      {photo.moderationReason === 'suspicious_content' ? '🔍' : photo.moderationReason === 'low_face_confidence' ? '👤?' : '⚠️'}
                    </div>
                  </div>
                  <div className="p-2">
                    {photo.phoneNumber && <p className="text-xs text-white/40 mb-1">📱 {photo.phoneNumber}</p>}
                    <div className="flex gap-1.5">
                      <button className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-green-500/20 text-green-400 active:bg-green-500/30"
                        onClick={() => handleApprovePhoto(photo.id)}>✓ {he ? 'אשר' : 'Approve'}</button>
                      <button className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 active:bg-red-500/30"
                        onClick={() => handleRejectPhoto(photo.id)}>✕ {he ? 'דחה' : 'Reject'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {approvedPhotos.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-2xl text-xs font-bold bg-white/8 text-white/60 active:bg-white/15 border border-white/10"
                onClick={selectAll}>
                {selectedIds.size === photos.length ? (he ? 'בטל סימון' : 'Deselect All') : (he ? 'סמן הכל' : 'Select All')}
              </button>
              <button className="btn-secondary flex-1 text-xs" onClick={handleDownloadAll}>
                📥 {he ? 'הורד הכל' : 'Download All'}
              </button>
              <button className="flex-1 py-2 rounded-2xl text-xs font-bold bg-red-500/15 text-red-400 active:bg-red-500/25 border border-red-500/20"
                onClick={handleDeleteAllPhotos}>
                🗑️ {he ? 'מחק הכל' : 'Delete All'}
              </button>
            </div>

            {/* Send to Print button - appears when photos are selected */}
            {selectedIds.size > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="w-full py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 border border-purple-500/30"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.2))' }}
                onClick={handleSendToPrint}
                disabled={sendingToPrint}
              >
                {sendingToPrint ? '⏳' : '🖨️'} {he ? `שלח ${selectedIds.size} להדפסה` : `Send ${selectedIds.size} to Print`}
              </motion.button>
            )}
          </div>
        )}

        {/* Photo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {approvedPhotos.map((photo, i) => {
            const isSelected = selectedIds.has(photo.id);
            return (
              <motion.div key={photo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className={`glass-card overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                {/* Selectable photo */}
                <div className="relative bg-black cursor-pointer" onClick={() => toggleSelect(photo.id)}>
                    <img src={api.getPhotoImageUrl(photo.id)} alt="" className="w-full object-contain" loading="lazy" />
                  {/* Selection checkbox */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-20 ${isSelected ? 'bg-primary border-primary' : 'border-white/50 bg-black/30'}`}>
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  {/* Print status badge */}
                  {photo.printStatus === 'sent' && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-purple-500/80 text-xs font-bold text-white z-20">🖨️</div>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-white/30">{new Date(photo.createdAt).toLocaleTimeString()}</p>
                    {photo.phoneNumber && <p className="text-xs text-white/40">📱 {photo.phoneNumber}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-white/8 text-white/60 active:bg-white/15"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = photo.photoUrl;
                        link.download = `photo_${photo.id.slice(0, 8)}.jpg`;
                        link.click();
                      }}>📥</button>
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-green-500/15 text-green-400 active:bg-green-500/25"
                      onClick={() => {
                        const photoUrl = `${window.location.origin}/api/photos/${photo.id}/image`;
                        window.open(`https://wa.me/?text=${encodeURIComponent('📸 ' + (event?.name || '') + '\n' + photoUrl)}`, '_blank');
                      }}>📤</button>
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 active:bg-red-500/25"
                      onClick={() => handleDeletePhoto(photo.id)}>🗑️</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {photos.length === 0 && (
          <div className="glass-card p-10 text-center">
            <span className="text-5xl block mb-3">📸</span>
            <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין תמונות באירוע' : 'No photos in this event'}</h3>
          </div>
        )}
      </motion.div>
    );
  }

  // ===== EVENTS TABLE VIEW =====
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-sm font-bold text-white/50 mb-3">{he ? 'בחר אירוע לצפייה בגלריה' : 'Select event to view gallery'}</h3>
      <div className="space-y-3">
        {events.map((event, i) => {
          const count = photoCounts[event.id] || 0;
          return (
            <motion.button key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card p-4 w-full flex items-center justify-between active:scale-[0.98] transition-transform text-left"
              onClick={() => openGallery(event.id)}>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white">{event.name}</h4>
                <p className="text-xs text-white/40">{event.date.replace(/-/g, '.')}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{count}</p>
                  <p className="text-xs text-white/40">{he ? 'תמונות' : 'photos'}</p>
                </div>
                <span className="text-white/30">›</span>
              </div>
            </motion.button>
          );
        })}
      </div>
      {events.length === 0 && (
        <div className="glass-card p-10 text-center">
          <span className="text-5xl block mb-3">📸</span>
          <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין אירועים' : 'No events'}</h3>
        </div>
      )}
    </motion.div>
  );
}

// ===================== QR CODE =====================
// ===================== USERS TAB (Super Admin) =====================
function UsersTab({ currentUserId }: { currentUserId?: string }) {
  const { locale } = useStore();
  const he = locale === 'he';
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'account_manager' | 'super_admin'>('account_manager');
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean }>({});
  const loader = useLoader();

  // Actions dropdown for the mobile card layout — only one open at a time.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openMenuId) return;
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [openMenuId]);

  const loadUsers = () => {
    api.getUsers().then((data: UserData[]) => { setUsers(data); setLoading(false); }).catch((err) => {
      setLoading(false);
      showActionError(err);
    });
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleActive = async (user: UserData) => withErrorAlert(async () => {
    await api.updateUser(user.id, { active: !user.active });
    setUsers(users.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
  });

  const toggleRole = async (user: UserData) => withErrorAlert(async () => {
    const newRole = user.role === 'super_admin' ? 'account_manager' : 'super_admin';
    await api.updateUser(user.id, { role: newRole });
    setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
  });

  const resetForm = () => {
    setName(''); setEmail(''); setPhone(''); setPassword(''); setRole('account_manager');
    setShowForm(false); setEditingId(null); setErrors({});
  };

  const startEdit = (user: UserData) => {
    setName(user.name); setEmail(user.email); setPhone(user.phone || '');
    setPassword(''); setRole(user.role as 'account_manager' | 'super_admin');
    setEditingId(user.id); setShowForm(true);
  };

  const handleSave = async () => {
    const errs = { name: !name.trim(), email: !email.trim() };
    setErrors(errs);
    if (errs.name || errs.email) {
      Swal.fire({ icon: 'warning', title: he ? 'שדות חסרים' : 'Missing Fields', text: he ? 'נא למלא שם ואימייל' : 'Please fill in name and email', background: '#0a0a0a', color: '#fff', confirmButtonColor: '#D4AF37' });
      return;
    }
    if (password && password.length < 6) {
      Swal.fire({ icon: 'warning', title: he ? 'סיסמה קצרה מדי' : 'Password too short', text: he ? 'הסיסמה חייבת להכיל 6 תווים לפחות' : 'Password must be at least 6 characters', background: '#0a0a0a', color: '#fff', confirmButtonColor: '#D4AF37' });
      return;
    }
    if (!editingId) return; // this form only edits existing users
    await loader.run(he ? 'שומר שינויים...' : 'Saving changes...', async () => {
      await api.updateUser(editingId, { name, email, phone, role, ...(password ? { password } : {}) });
      resetForm();
      loadUsers();
      Swal.fire({ icon: 'success', title: he ? '✅ נשמר בהצלחה!' : '✅ Saved!', timer: 1800, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  const handleDelete = async (user: UserData) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: he ? 'למחוק משתמש?' : 'Delete user?',
      html: he
        ? `<p style="color:rgba(255,255,255,0.6);font-size:14px;">המשתמש <b style="color:white">${user.name}</b> יימחק לצמיתות.<br/>האירועים והלידים שלו (${user._count.events}) יישארו במערכת אך יהפכו לבלתי-משויכים.</p>`
        : `<p style="color:rgba(255,255,255,0.6);font-size:14px;">User <b style="color:white">${user.name}</b> will be permanently deleted.<br/>Their events and leads (${user._count.events}) will stay in the system but become unassigned.</p>`,
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#333',
      confirmButtonText: he ? '🗑️ מחק' : '🗑️ Delete', cancelButtonText: he ? 'ביטול' : 'Cancel',
      background: '#0a0a0a', color: '#fff',
    });
    if (!result.isConfirmed) return;
    await loader.run(he ? 'מוחק משתמש...' : 'Deleting user...', async () => {
      await api.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      Swal.fire({ icon: 'success', title: he ? 'נמחק!' : 'Deleted!', timer: 1500, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
    });
  };

  const handleLoginAs = async (user: UserData) => {
    // The impersonate API call authenticates as whichever account is
    // currently active. If an impersonation session is already open, that's
    // the *impersonated* user's (non-admin) token — a second "log in as"
    // click would use that token and get a confusing generic 403 instead of
    // the real reason. Catch it here with a clear message and route back to
    // admin first, rather than letting the request fail unexplained.
    if (api.isImpersonating()) {
      await Swal.fire({
        icon: 'info',
        title: he ? 'כבר בתוך התחזות למשתמש אחר' : 'Already impersonating another user',
        text: he
          ? 'קודם תחזור לניהול (הכפתור "חזרה לניהול" למעלה), ורק אז תוכל להיכנס לחשבון של משתמש נוסף.'
          : 'Return to admin first (the "Return to admin" button at the top), then you can log in as a different user.',
        confirmButtonColor: '#D4AF37', background: '#0a0a0a', color: '#fff',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: he ? `להיכנס לחשבון של ${user.name}?` : `Log in as ${user.name}?`,
      text: he ? 'תעבור לצפות במערכת בדיוק כפי שהוא רואה אותה. תוכל לחזור לניהול בכל רגע.' : "You'll switch to viewing the app exactly as they see it. You can return to admin anytime.",
      showCancelButton: true, confirmButtonColor: '#D4AF37', cancelButtonColor: '#333',
      confirmButtonText: he ? 'היכנס' : 'Log in', cancelButtonText: he ? 'ביטול' : 'Cancel',
      background: '#0a0a0a', color: '#fff',
    });
    if (!result.isConfirmed) return;
    await withErrorAlert(async () => {
      const data = await api.loginAsUser(user.id);
      window.location.href = data.user.role === 'super_admin' ? '/admin' : '/dashboard';
    });
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-transparent" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {loader.visible && loader.message && <BrandedLoader message={loader.message} />}
      <h2 className="text-lg font-bold text-white mb-4">
        {he ? 'ניהול משתמשים' : 'User Management'}
        <span className="text-xs text-white/30 font-normal ml-2">({users.length})</span>
      </h2>

      {/* Edit form — opened via the "Edit" action on a row below */}
      <AnimatePresence>
        {showForm && editingId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 mb-5 overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4">{he ? 'ערוך משתמש' : 'Edit User'}</h3>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs mb-1 ${errors.name ? 'text-red-400' : 'text-white/50'}`}>{he ? 'שם' : 'Name'} *</label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
                  className={`w-full px-4 py-3 rounded-xl bg-white/8 border text-white placeholder-white/25 focus:outline-none text-base ${errors.name ? 'border-red-500' : 'border-white/15 focus:border-primary'}`} />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${errors.email ? 'text-red-400' : 'text-white/50'}`}>{he ? 'אימייל' : 'Email'} *</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: false })); }}
                  className={`w-full px-4 py-3 rounded-xl bg-white/8 border text-white placeholder-white/25 focus:outline-none text-base ${errors.email ? 'border-red-500' : 'border-white/15 focus:border-primary'}`} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">{he ? 'טלפון' : 'Phone'}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none text-base" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">{he ? 'תפקיד' : 'Role'}</label>
                <select value={role} onChange={(e) => setRole(e.target.value as 'account_manager' | 'super_admin')}
                  disabled={editingId === currentUserId}
                  className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none text-base disabled:opacity-50">
                  <option value="account_manager" className="bg-[#111]">{he ? 'מנהל חשבון' : 'Account Manager'}</option>
                  <option value="super_admin" className="bg-[#111]">{he ? 'מנהל אתר' : 'Super Admin'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">{he ? 'סיסמה חדשה (השאר ריק כדי לא לשנות)' : 'New password (leave blank to keep current)'}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none text-base" dir="ltr" />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-secondary flex-1" onClick={resetForm}>{he ? 'ביטול' : 'Cancel'}</button>
                <button className="btn-glow flex-1" onClick={handleSave}>{he ? 'שמור' : 'Save'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: card list with a per-user actions dropdown instead of a
          side-scrolling 8-column table — nothing to scroll to discover. */}
      <div className="sm:hidden glass-card overflow-hidden divide-y divide-white/5" dir={he ? 'rtl' : 'ltr'}>
        {users.map((user, index) => {
          const isSelf = user.id === currentUserId;
          const menuOpen = openMenuId === user.id;
          // The menu opens downward by default, which clips off-screen for
          // rows near the bottom of the list (worst case: the very last
          // row, with nothing below it at all). Flip it upward for the
          // last couple of rows instead of measuring viewport space at
          // runtime — simple and correct for how this list is laid out.
          const openUpward = index >= users.length - 2;
          return (
            <div key={user.id} className="p-3 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-white font-bold text-sm truncate">
                  {user.name}{isSelf && <span className="text-white/30 font-normal"> ({he ? 'אתה' : 'you'})</span>}
                </div>
                <div className="text-white/50 text-xs truncate" dir="ltr">{user.email}</div>
                <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.role === 'super_admin' ? 'bg-primary/20 text-[#D4AF37]' : 'bg-white/8 text-white/50'}`}>
                    {user.role === 'super_admin' ? (he ? 'מנהל אתר' : 'Super Admin') : (he ? 'מנהל חשבון' : 'Account Mgr')}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${user.active ? 'text-green-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {user.active ? (he ? 'פעיל' : 'Active') : (he ? 'מושבת' : 'Disabled')}
                  </span>
                  <span className="text-[10px] text-white/30">{he ? 'אירועים' : 'events'}: {user._count.events}</span>
                </div>
              </div>

              <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
                <button onClick={() => setOpenMenuId(menuOpen ? null : user.id)}
                  aria-label={he ? 'פעולות' : 'Actions'}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 text-white/60 hover:bg-white/15 hover:text-white text-lg leading-none">
                  ⋮
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: openUpward ? 4 : -4 }}
                      className={`absolute z-20 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} min-w-[10rem] rounded-xl overflow-hidden border border-white/10 shadow-xl`}
                      style={{ background: '#141414', insetInlineEnd: 0 }}
                    >
                      <button onClick={() => { startEdit(user); setOpenMenuId(null); }}
                        className="block w-full text-start px-4 py-2.5 text-sm text-blue-400 hover:bg-white/5">
                        {he ? '✏️ ערוך' : '✏️ Edit'}
                      </button>
                      {!isSelf && (
                        <button onClick={() => { setOpenMenuId(null); handleLoginAs(user); }}
                          className="block w-full text-start px-4 py-2.5 text-sm text-purple-400 hover:bg-white/5">
                          {he ? '👤 היכנס לחשבון' : '👤 Log in as'}
                        </button>
                      )}
                      {!isSelf && (
                        <button onClick={() => { toggleRole(user); setOpenMenuId(null); }}
                          className="block w-full text-start px-4 py-2.5 text-sm text-white/70 hover:bg-white/5">
                          {he ? '🔁 החלף תפקיד' : '🔁 Switch role'}
                        </button>
                      )}
                      {!isSelf && (
                        <button onClick={() => { toggleActive(user); setOpenMenuId(null); }}
                          className="block w-full text-start px-4 py-2.5 text-sm text-white/70 hover:bg-white/5">
                          {user.active ? (he ? '⏸️ השבת' : '⏸️ Disable') : (he ? '▶️ הפעל' : '▶️ Activate')}
                        </button>
                      )}
                      {!isSelf && (
                        <button onClick={() => { setOpenMenuId(null); handleDelete(user); }}
                          className="block w-full text-start px-4 py-2.5 text-sm text-red-400 hover:bg-white/5">
                          {he ? '🗑️ מחק' : '🗑️ Delete'}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            {he ? 'אין משתמשים רשומים' : 'No registered users'}
          </div>
        )}
      </div>

      {/* Tablet/desktop: full table */}
      <div className="hidden sm:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir={he ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase">
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'שם' : 'Name'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'אימייל' : 'Email'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'טלפון' : 'Phone'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'תפקיד' : 'Role'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'סטטוס' : 'Status'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'אירועים' : 'Events'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'נרשם' : 'Joined'}</th>
                <th className="text-start px-3 py-2.5 font-medium">{he ? 'פעולות' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] align-middle">
                    <td className="px-3 py-3 text-white font-bold whitespace-nowrap">
                      {user.name}{isSelf && <span className="text-white/30 font-normal"> ({he ? 'אתה' : 'you'})</span>}
                    </td>
                    <td className="px-3 py-3 text-white/60 whitespace-nowrap" dir="ltr">{user.email}</td>
                    <td className="px-3 py-3 text-white/60 whitespace-nowrap" dir="ltr">{user.phone || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button onClick={() => toggleRole(user)} disabled={isSelf}
                        className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          user.role === 'super_admin' ? 'bg-primary/20 text-[#D4AF37] hover:bg-primary/30' : 'bg-white/8 text-white/50 hover:bg-white/15'
                        }`} title={isSelf ? '' : (he ? 'לחץ להחלפת תפקיד' : 'Click to switch role')}>
                        {user.role === 'super_admin' ? (he ? 'מנהל אתר' : 'Super Admin') : (he ? 'מנהל חשבון' : 'Account Mgr')}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button onClick={() => toggleActive(user)} disabled={isSelf}
                        className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${user.active ? 'text-green-400 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-500/10'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.active ? (he ? 'פעיל' : 'Active') : (he ? 'מושבת' : 'Disabled')}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-white/50 whitespace-nowrap">{user._count.events}</td>
                    <td className="px-3 py-3 text-white/40 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEdit(user)} title={he ? 'ערוך' : 'Edit'}
                          className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25">
                          {he ? 'ערוך' : 'Edit'}
                        </button>
                        {!isSelf && (
                          <button onClick={() => handleLoginAs(user)} title={he ? 'היכנס לחשבון' : 'Log in as'}
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 hover:bg-purple-500/25">
                            {he ? 'כניסה' : 'Login as'}
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => handleDelete(user)} title={he ? 'מחק' : 'Delete'}
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25">
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            {he ? 'אין משתמשים רשומים' : 'No registered users'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===================== LEADS TAB =====================
function LeadsTab() {
  const { locale } = useStore();
  const he = locale === 'he';
  const isRtl = locale === 'he';
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);

  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || '{}') : {};
  const isSuperAdmin = storedUser.role === 'super_admin';

  const loadLeads = () => {
    setLoading(true);
    api.getLeads().then((data: LeadData[]) => { setLeads(data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadLeads(); }, []);

  const formatWaPhone = (phone: string) => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return cleaned.startsWith('0') ? '972' + cleaned.slice(1) : cleaned.replace('+', '');
  };

  const handleWhatsApp = async (lead: LeadData) => {
    // Opening WhatsApp is the point of the click — do it regardless of
    // whether the "mark as handled" bookkeeping call below succeeds; that's
    // a background side effect, not worth interrupting the user over.
    window.open(`https://wa.me/${formatWaPhone(lead.phone)}`, '_blank');
    if (!lead.handled) {
      try {
        await api.updateLead(lead.id, { handled: true });
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, handled: true } : l));
      } catch (err) {
        console.error('Failed to mark lead as handled:', err);
      }
    }
  };

  const handleCall = async (lead: LeadData) => {
    window.location.href = `tel:${lead.phone}`;
    if (!lead.handled) {
      try {
        await api.updateLead(lead.id, { handled: true });
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, handled: true } : l));
      } catch (err) {
        console.error('Failed to mark lead as handled:', err);
      }
    }
  };

  const toggleHandled = async (lead: LeadData) => withErrorAlert(async () => {
    const next = !lead.handled;
    await api.updateLead(lead.id, { handled: next });
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, handled: next } : l));
  });

  const handleDeleteLead = async (lead: LeadData) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: he ? 'למחוק ליד?' : 'Delete lead?',
      html: he
        ? `<p style="color:rgba(255,255,255,0.6);font-size:14px;">הליד של <b style="color:white">${lead.name || lead.phone}</b> יימחק לצמיתות.<br/>המשתמש יוכל להשאיר פרטים שוב בפוטובות.</p>`
        : `<p style="color:rgba(255,255,255,0.6);font-size:14px;">Lead for <b style="color:white">${lead.name || lead.phone}</b> will be permanently deleted.<br/>The user will be able to submit details again.</p>`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#333',
      confirmButtonText: he ? '🗑️ מחק' : '🗑️ Delete',
      cancelButtonText: he ? 'ביטול' : 'Cancel',
      background: '#0a0a0a',
      color: '#fff',
    });
    if (!result.isConfirmed) return;

    await withErrorAlert(async () => {
      await api.deleteLead(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      Swal.fire({
        icon: 'success',
        title: he ? 'נמחק!' : 'Deleted!',
        text: he ? 'המשתמש יוכל להשאיר פרטים שוב' : 'The user can now submit details again',
        timer: 2000,
        showConfirmButton: false,
        background: '#0a0a0a',
        color: '#fff',
      });
    });
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-transparent" style={{ borderTopColor: '#D4AF37', borderRightColor: '#D4AF37' }} />
      </motion.div>
    );
  }

  const unhandled = leads.filter(l => !l.handled).length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">
            {he ? 'לידים' : 'Leads'}
          </h2>
          {unhandled > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {unhandled} {he ? 'לא טופלו' : 'pending'}
            </span>
          )}
          <span className="text-xs text-white/30">({leads.length})</span>
        </div>
        <button onClick={loadLeads}
          className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 active:bg-white/10 transition-colors">
          ↻ {he ? 'רענן' : 'Refresh'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          {he ? 'לא טופל' : 'Not handled'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          {he ? 'טופל' : 'Handled'}
        </div>
        <p className="text-xs text-white/25 ml-auto">{he ? 'לחץ על הנקודה לשינוי ידני' : 'Tap dot to toggle'}</p>
      </div>

      {leads.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <span className="text-5xl block mb-3">💎</span>
          <h3 className="text-lg font-bold text-white mb-2">{he ? 'אין לידים עדיין' : 'No leads yet'}</h3>
          <p className="text-sm text-white/40 leading-relaxed">
            {he ? 'לידים יופיעו כאן כאשר אורחים יסכימו לקבל הצעה' : 'Leads appear here when guests agree to receive an offer'}
          </p>
        </div>
      ) : (
        <div className="space-y-2" dir={isRtl ? 'rtl' : 'ltr'}>
          {leads.map((lead, i) => (
            <motion.div key={lead.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass-card overflow-hidden"
              style={{ borderLeft: lead.handled ? '2px solid rgba(34,197,94,0.4)' : '2px solid rgba(239,68,68,0.4)' }}
            >
              <div className="flex items-center gap-3 px-3 py-3">

                {/* Status dot — clickable to toggle */}
                <button
                  onClick={() => toggleHandled(lead)}
                  className="flex-shrink-0 w-3 h-3 rounded-full transition-all active:scale-75"
                  style={{
                    background: lead.handled ? '#22c55e' : '#ef4444',
                    boxShadow: lead.handled ? '0 0 6px rgba(34,197,94,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                  }}
                  title={lead.handled ? (he ? 'טופל — לחץ לביטול' : 'Handled — click to undo') : (he ? 'לא טופל — לחץ לסימון' : 'Not handled — click to mark')}
                />

                {/* Info — all in one line */}
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold text-white text-sm">{lead.name || (he ? 'ללא שם' : 'No name')}</span>
                  <span className="text-white/20 text-xs">|</span>
                  <span className="text-white/55 text-sm" dir="ltr">{lead.phone}</span>
                  <span className="text-white/20 text-xs">|</span>
                  <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>{lead.eventDate.split('-').reverse().join('.')}</span>
                  {lead.sourceEvent && (
                    <>
                      <span className="text-white/20 text-xs">|</span>
                      <span className="text-white/35 text-xs">{lead.sourceEvent.name}</span>
                    </>
                  )}
                  {isSuperAdmin && lead.owner && (
                    <>
                      <span className="text-white/20 text-xs">|</span>
                      <span className="text-white/35 text-xs">👤 {lead.owner.name}</span>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* WhatsApp */}
                  <button onClick={() => handleWhatsApp(lead)} title="WhatsApp"
                    className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#25D166">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </button>
                  {/* Call */}
                  <button onClick={() => handleCall(lead)} title={he ? 'התקשר' : 'Call'}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </button>
                  {/* Delete */}
                  <button onClick={() => handleDeleteLead(lead)} title={he ? 'מחק' : 'Delete'}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function QRCodeDisplay({ eventId }: { eventId: string }) {
  const [qrSvg, setQrSvg] = useState<string>('');
  useEffect(() => {
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = `${window.location.origin}/event/${eventId}`;
        const svg = await QRCode.toString(url, { type: 'svg', color: { dark: '#0a0a0a', light: '#ffffff' }, margin: 2, width: 200 });
        setQrSvg(svg);
      } catch (err) { console.error('QR failed:', err); }
    })();
  }, [eventId]);
  if (!qrSvg) return <div className="w-[180px] h-[180px] mx-auto bg-gray-100 animate-pulse rounded-xl" />;
  return <div className="inline-block" dangerouslySetInnerHTML={{ __html: qrSvg }} />;
}
