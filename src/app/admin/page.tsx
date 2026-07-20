'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { api } from '@/lib/api';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Link from 'next/link';

type Tab = 'events' | 'overlays' | 'photos';

interface EventData { id: string; name: string; date: string; maxPrintsPerDevice: number; active: boolean; }
interface OverlayData { id: string; name: string; url: string; }
interface PhotoData { id: string; eventId: string; photoUrl: string; overlayId: string | null; deviceId: string; createdAt: string; event?: EventData; overlay?: OverlayData; }

export default function AdminPage() {
  const hydrated = useHydrated();
  const { locale } = useStore();
  const [tab, setTab] = useState<Tab>('events');
  const isRtl = locale === 'he';
  const he = locale === 'he';

  if (!hydrated) return null;

  return (
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
  );
}

// ===================== EVENTS TAB =====================
function EventsTab() {
  const { locale } = useStore();
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
    if (errs.name || errs.date) return;

    if (editingId) {
      await api.updateEvent(editingId, { name, date, maxPrintsPerDevice: maxPrints });
    } else {
      await api.createEvent({ name, date, maxPrintsPerDevice: maxPrints });
    }
    resetForm();
    loadEvents();
  };

  const startEdit = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setName(ev.name); setDate(ev.date); setMaxPrints(ev.maxPrintsPerDevice);
    setEditingId(id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(he ? 'למחוק?' : 'Delete?')) return;
    await api.deleteEvent(id);
    loadEvents();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await api.updateEvent(id, { active: !active });
    loadEvents();
  };

  if (loading) return <div className="text-center py-10"><span className="text-3xl">⏳</span></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                  <p className="text-xs text-white/40">{event.date}</p>
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

  const handleDelete = async (id: string) => {
    if (!confirm(he ? 'למחוק?' : 'Delete?')) return;
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
                onClick={() => handleDelete(overlay.id)}>✕</button>
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
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getEvents(), api.getPhotos()]).then(([evs, phs]) => {
      setEvents(evs); setPhotos(phs); setLoading(false);
    });
  }, []);

  useEffect(() => {
    api.getPhotos(selectedEvent === 'all' ? undefined : selectedEvent).then(setPhotos);
  }, [selectedEvent]);

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold ${selectedEvent === 'all' ? 'bg-primary text-white' : 'bg-white/8 text-white/60'}`}
          onClick={() => setSelectedEvent('all')}>
          {he ? 'הכל' : 'All'}
        </button>
        {events.map((ev) => (
          <button key={ev.id} className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold ${selectedEvent === ev.id ? 'bg-primary text-white' : 'bg-white/8 text-white/60'}`}
            onClick={() => setSelectedEvent(ev.id)}>
            {ev.name}
          </button>
        ))}
      </div>

      {photos.length > 0 && (
        <button className="btn-secondary w-full mb-4" onClick={handleDownloadAll}>
          📥 {he ? `הורד הכל (${photos.length})` : `Download All (${photos.length})`}
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <motion.div key={photo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="glass-card overflow-hidden">
            <div className="aspect-[3/4] relative bg-black">
              <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" />
              {photo.overlay && <img src={photo.overlay.url} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}
            </div>
            <div className="p-2">
              <p className="text-[10px] text-white/40 truncate">{photo.event?.name}</p>
              <p className="text-[10px] text-white/30">{new Date(photo.createdAt).toLocaleTimeString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="glass-card p-10 text-center">
          <span className="text-5xl block mb-3">📸</span>
          <h3 className="text-lg font-bold text-white mb-1">{he ? 'אין תמונות עדיין' : 'No photos yet'}</h3>
          <p className="text-sm text-white/40">{he ? 'תמונות מהאורחים יופיעו כאן' : 'Guest photos will appear here'}</p>
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
