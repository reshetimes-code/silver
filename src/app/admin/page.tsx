'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Logo from '@/components/ui/Logo';
import AdminAuth from '@/components/ui/AdminAuth';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';

type Tab = 'events' | 'overlays' | 'photos';

interface EventData { id: string; name: string; date: string; maxPrintsPerDevice: number; active: boolean; }
interface OverlayData { id: string; name: string; url: string; }
interface PhotoData { id: string; eventId: string; photoUrl: string; overlayId: string | null; deviceId: string; phoneNumber: string; moderationStatus: string; moderationReason: string | null; printStatus: string; createdAt: string; event?: EventData; overlay?: OverlayData; }

export default function AdminPage() {
  const hydrated = useHydrated();
  const { locale } = useStore();
  const [tab, setTab] = useState<Tab>('events');
  const isRtl = locale === 'he';
  const he = locale === 'he';

  if (!hydrated) return null;

  return (
    <AdminAuth>
    <div className="min-h-dvh relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />
      <div className="app-header flex items-center justify-between">
        <Link href="/"><Logo size="sm" /></Link>
        <h1 className="text-sm font-bold text-white/80">{t(locale, 'admin')}</h1>
      </div>
      <div className="sticky top-[53px] z-30 bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-white/5">
        <div className="flex max-w-3xl mx-auto">
          {([
            { id: 'events' as Tab, label: he ? 'אירועים' : 'Events', icon: '🎉' },
            { id: 'overlays' as Tab, label: he ? 'מסגרות' : 'Overlays', icon: '🖼️' },
            { id: 'photos' as Tab, label: he ? 'תמונות' : 'Photos', icon: '📸' },
          ]).map((tb) => (
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
          {tab === 'events' && <EventsTab key="events" />}
          {tab === 'overlays' && <OverlaysTab key="overlays" />}
          {tab === 'photos' && <PhotosTab key="photos" />}
        </AnimatePresence>
      </div>
    </div>
    </AdminAuth>
  );
}

// ===================== EVENTS TAB =====================
function EventsTab() {
  const { locale, showLanguageToggle, setShowLanguageToggle } = useStore();
  const he = locale === 'he';
  const [events, setEvents] = useState<EventData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [maxPrints, setMaxPrints] = useState(5);
  const [errors, setErrors] = useState<{ name?: boolean; date?: boolean }>({});
  const [loading, setLoading] = useState(true);

  const loadEvents = () => {
    api.getEvents().then((data) => { setEvents(data); setLoading(false); });
  };

  useEffect(() => { loadEvents(); }, []);

  const resetForm = () => {
    setName(''); setDate(''); setMaxPrints(5); setShowForm(false); setEditingId(null); setErrors({});
  };

  const handleSave = async () => {
    const errs = { name: !name.trim(), date: !date };
    setErrors(errs);
    if (errs.name || errs.date) {
      Swal.fire({ icon: 'warning', title: he ? 'שדות חסרים' : 'Missing Fields', text: he ? 'נא למלא שם אירוע ותאריך' : 'Please fill in event name and date', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#e94560' });
      return;
    }

    if (editingId) {
      await api.updateEvent(editingId, { name, date, maxPrintsPerDevice: maxPrints });
    } else {
      await api.createEvent({ name, date, maxPrintsPerDevice: maxPrints });
    }
    resetForm();
    loadEvents();
    Swal.fire({ icon: 'success', title: he ? 'נשמר!' : 'Saved!', timer: 1500, showConfirmButton: false, background: '#1a1a2e', color: '#fff' });
  };

  const startEdit = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setName(ev.name); setDate(ev.date); setMaxPrints(ev.maxPrintsPerDevice);
    setEditingId(id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({ icon: 'warning', title: he ? 'למחוק אירוע?' : 'Delete event?', text: he ? 'כל התמונות של האירוע יימחקו' : 'All photos for this event will be deleted', showCancelButton: true, confirmButtonColor: '#e94560', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק' : 'Delete', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#1a1a2e', color: '#fff' });
    if (!result.isConfirmed) return;
    await api.deleteEvent(id);
    loadEvents();
    Swal.fire({ icon: 'success', title: he ? 'נמחק!' : 'Deleted!', timer: 1500, showConfirmButton: false, background: '#1a1a2e', color: '#fff' });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await api.updateEvent(id, { active: !active });
    loadEvents();
  };

  if (loading) return <div className="text-center py-10"><span className="text-3xl">⏳</span></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Language toggle switch */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white/80">Show Language Button</p>
          <p className="text-[10px] text-white/40">Show/hide HEB/ENG toggle for guests</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${errors.date ? 'text-red-400' : 'text-white/50'}`}>{he ? 'תאריך' : 'Date'} *</label>
                  <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: false })); }}
                    className={`w-full px-3 py-3 rounded-xl bg-white/8 border text-white focus:outline-none text-base ${errors.date ? 'border-red-500' : 'border-white/15 focus:border-primary'}`} />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">{he ? 'מקסימום הדפסות' : 'Max Prints'}</label>
                  <input type="number" value={maxPrints} onChange={(e) => setMaxPrints(parseInt(e.target.value) || 1)} min={1} max={50}
                    className="w-full px-3 py-3 rounded-xl bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none text-base" />
                </div>
              </div>
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
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${event.active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
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
                    <p className="text-[10px] text-gray-400 mt-2 break-all select-all">
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
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOverlays = () => {
    api.getOverlays().then((data) => { setOverlays(data); setLoading(false); });
  };

  useEffect(() => { loadOverlays(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.replace(/\.[^.]+$/, '');
      await api.uploadOverlay(file, name);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadOverlays();
  };

  const handleDeleteOverlay = async (id: string) => {
    const result = await Swal.fire({ icon: 'warning', title: he ? 'למחוק מסגרת?' : 'Delete overlay?', showCancelButton: true, confirmButtonColor: '#e94560', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק' : 'Delete', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#1a1a2e', color: '#fff' });
    if (!result.isConfirmed) return;
    await api.deleteOverlay(id);
    loadOverlays();
  };

  if (loading) return <div className="text-center py-10"><span className="text-3xl">⏳</span></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <input ref={fileInputRef} type="file" accept="image/png" multiple className="hidden" onChange={handleUpload} />
      <button className="btn-glow w-full mb-5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? '⏳' : '+'} {he ? 'העלה מסגרות PNG' : 'Upload PNG Overlays'}
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {overlays.map((overlay, i) => (
          <motion.div key={overlay.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
            className="glass-card overflow-hidden relative">
            <div className="aspect-[3/4] relative">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #252540 0% 50%)',
                backgroundSize: '12px 12px',
              }} />
              <img src={overlay.url} alt={overlay.name} className="relative w-full h-full object-contain p-1" />
            </div>
            <div className="p-2 flex items-center justify-between">
              <p className="text-xs font-bold text-white/70 truncate flex-1">{overlay.name}</p>
              <button className="w-7 h-7 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-xs active:bg-red-500/30 flex-shrink-0"
                onClick={() => handleDeleteOverlay(overlay.id)}>✕</button>
            </div>
          </motion.div>
        ))}
      </div>

      {overlays.length === 0 && (
        <div className="glass-card p-10 text-center">
          <span className="text-5xl block mb-3">🖼️</span>
          <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין מסגרות עדיין' : 'No overlays yet'}</h3>
          <p className="text-sm text-white/40">{he ? 'העלה קבצי PNG עם רקע שקוף' : 'Upload PNG files with transparent background'}</p>
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
    const evs = await api.getEvents();
    setEvents(evs);
    const counts: Record<string, number> = {};
    const allPhotos = await api.getPhotos();
    for (const p of allPhotos) {
      counts[p.eventId] = (counts[p.eventId] || 0) + 1;
    }
    setPhotoCounts(counts);
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, []);

  const openGallery = async (eventId: string) => {
    setSelectedEventId(eventId);
    setLoadingPhotos(true);
    setSelectedIds(new Set());
    const p = await api.getPhotos(eventId);
    setPhotos(p);
    setLoadingPhotos(false);
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
    const result = await Swal.fire({ icon: 'question', title: he ? `לשלוח ${selectedIds.size} תמונות להדפסה?` : `Send ${selectedIds.size} photos to print?`, text: he ? 'התמונות יישלחו לדרופבוקס' : 'Photos will be sent to Dropbox', showCancelButton: true, confirmButtonColor: '#e94560', cancelButtonColor: '#333', confirmButtonText: he ? 'שלח' : 'Send', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#1a1a2e', color: '#fff' });
    if (!result.isConfirmed) return;
    setSendingToPrint(true);
    const res = await api.sendToPrint(Array.from(selectedIds));
    setSendingToPrint(false);
    if (res.sent > 0) {
      setPhotos((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, printStatus: 'sent' } : p));
      setSelectedIds(new Set());
      Swal.fire({ icon: 'success', title: he ? `${res.sent} תמונות נשלחו להדפסה!` : `${res.sent} photos sent to print!`, timer: 2000, showConfirmButton: false, background: '#1a1a2e', color: '#fff' });
    }
    if (res.failed > 0) {
      Swal.fire({ icon: 'error', title: he ? `${res.failed} תמונות נכשלו` : `${res.failed} photos failed`, text: he ? 'בדוק הגדרות דרופבוקס' : 'Check Dropbox settings', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#e94560' });
    }
  };

  const handleApprovePhoto = async (photoId: string) => {
    await api.updatePhoto(photoId, { moderationStatus: 'approved' });
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, moderationStatus: 'approved' } : p));
  };

  const handleRejectPhoto = async (photoId: string) => {
    await api.updatePhoto(photoId, { moderationStatus: 'rejected' });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleDeletePhoto = async (photoId: string) => {
    const result = await Swal.fire({ icon: 'warning', title: he ? 'למחוק תמונה?' : 'Delete photo?', showCancelButton: true, confirmButtonColor: '#e94560', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק' : 'Delete', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#1a1a2e', color: '#fff' });
    if (!result.isConfirmed) return;
    await api.deletePhoto(photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setPhotoCounts((prev) => ({ ...prev, [selectedEventId!]: (prev[selectedEventId!] || 1) - 1 }));
  };

  const handleDeleteAllPhotos = async () => {
    if (!selectedEventId) return;
    const result = await Swal.fire({ icon: 'error', title: he ? 'למחוק את כל התמונות?' : 'Delete ALL photos?', text: he ? 'פעולה זו לא ניתנת לביטול!' : 'This action cannot be undone!', showCancelButton: true, confirmButtonColor: '#e94560', cancelButtonColor: '#333', confirmButtonText: he ? 'מחק הכל' : 'Delete All', cancelButtonText: he ? 'ביטול' : 'Cancel', background: '#1a1a2e', color: '#fff' });
    if (!result.isConfirmed) return;
    await api.deleteEventPhotos(selectedEventId);
    setPhotos([]);
    setPhotoCounts((prev) => ({ ...prev, [selectedEventId]: 0 }));
    Swal.fire({ icon: 'success', title: he ? 'כל התמונות נמחקו' : 'All photos deleted', timer: 1500, showConfirmButton: false, background: '#1a1a2e', color: '#fff' });
  };

  const handleDownloadAll = async () => {
    for (const photo of photos) {
      const link = document.createElement('a');
      link.href = photo.photoUrl;
      link.download = `photo_${photo.id.slice(0, 8)}.jpg`;
      link.click();
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  if (loading) return <div className="text-center py-10"><span className="text-3xl">⏳</span></div>;

  // ===== GALLERY VIEW =====
  if (selectedEventId) {
    const event = events.find((e) => e.id === selectedEventId);
    const pendingReview = photos.filter((p) => p.moderationStatus === 'pending_review');
    const approvedPhotos = photos.filter((p) => p.moderationStatus === 'approved');

    if (loadingPhotos) return <div className="text-center py-10"><span className="text-3xl">⏳</span></div>;

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
                    <img src={photo.photoUrl} alt="" className="w-full aspect-[3/4] object-cover" />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-yellow-500/80 text-[8px] font-bold text-black">
                      {photo.moderationReason === 'suspicious_content' ? '🔍' : photo.moderationReason === 'low_face_confidence' ? '👤?' : '⚠️'}
                    </div>
                  </div>
                  <div className="p-2">
                    {photo.phoneNumber && <p className="text-[10px] text-white/40 mb-1">📱 {photo.phoneNumber}</p>}
                    <div className="flex gap-1.5">
                      <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/20 text-green-400 active:bg-green-500/30"
                        onClick={() => handleApprovePhoto(photo.id)}>✓ {he ? 'אשר' : 'Approve'}</button>
                      <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 active:bg-red-500/30"
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
                  {photo.overlay ? (
                    <div className="relative">
                      <img src={photo.overlay.url} alt="" className="relative w-full h-auto block z-10 pointer-events-none" />
                      <img src={photo.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
                    </div>
                  ) : (
                    <img src={photo.photoUrl} alt="" className="w-full aspect-[3/4] object-cover" />
                  )}
                  {/* Selection checkbox */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-20 ${isSelected ? 'bg-primary border-primary' : 'border-white/50 bg-black/30'}`}>
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  {/* Print status badge */}
                  {photo.printStatus === 'sent' && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-purple-500/80 text-[8px] font-bold text-white z-20">🖨️</div>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-white/30">{new Date(photo.createdAt).toLocaleTimeString()}</p>
                    {photo.phoneNumber && <p className="text-[10px] text-white/40">📱 {photo.phoneNumber}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white/8 text-white/60 active:bg-white/15"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = photo.photoUrl;
                        link.download = `photo_${photo.id.slice(0, 8)}.jpg`;
                        link.click();
                      }}>📥</button>
                    <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/15 text-green-400 active:bg-green-500/25"
                      onClick={() => {
                        const photoUrl = `${window.location.origin}/api/photos/${photo.id}/image`;
                        window.open(`https://wa.me/?text=${encodeURIComponent('📸 ' + (event?.name || '') + '\n' + photoUrl)}`, '_blank');
                      }}>📤</button>
                    <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/15 text-red-400 active:bg-red-500/25"
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
                  <p className="text-[10px] text-white/40">{he ? 'תמונות' : 'photos'}</p>
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
function QRCodeDisplay({ eventId }: { eventId: string }) {
  const [qrSvg, setQrSvg] = useState<string>('');
  useEffect(() => {
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = `${window.location.origin}/event/${eventId}`;
        const svg = await QRCode.toString(url, { type: 'svg', color: { dark: '#1a1a2e', light: '#ffffff' }, margin: 2, width: 200 });
        setQrSvg(svg);
      } catch (err) { console.error('QR failed:', err); }
    })();
  }, [eventId]);
  if (!qrSvg) return <div className="w-[180px] h-[180px] mx-auto bg-gray-100 animate-pulse rounded-xl" />;
  return <div className="inline-block" dangerouslySetInnerHTML={{ __html: qrSvg }} />;
}
