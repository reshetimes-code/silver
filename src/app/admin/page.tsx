'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

type Tab = 'events' | 'overlays' | 'photos';

export default function AdminPage() {
  const hydrated = useHydrated();
  const store = useStore();
  const { locale } = store;
  const [tab, setTab] = useState<Tab>('events');
  const isRtl = locale === 'he';

  if (!hydrated) return null;

  const he = locale === 'he';

  return (
    <div className="min-h-dvh relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      {/* Header */}
      <div className="app-header flex items-center justify-between">
        <Link href="/"><Logo size="sm" /></Link>
        <h1 className="text-sm font-bold text-white/80">{t(locale, 'admin')}</h1>
      </div>

      {/* Tabs */}
      <div className="sticky top-[53px] z-30 bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-white/5">
        <div className="flex max-w-3xl mx-auto">
          {([
            { id: 'events' as Tab, label: he ? 'אירועים' : 'Events', icon: '🎉' },
            { id: 'overlays' as Tab, label: he ? 'מסגרות' : 'Overlays', icon: '🖼️' },
            { id: 'photos' as Tab, label: he ? 'תמונות' : 'Photos', icon: '📸' },
          ]).map((t) => (
            <button
              key={t.id}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all relative ${
                tab === t.id ? 'text-primary' : 'text-white/40'
              }`}
              onClick={() => setTab(t.id)}
            >
              <span className="text-base block mb-0.5">{t.icon}</span>
              {t.label}
              {tab === t.id && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
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
  const { locale, events, addEvent, updateEvent, deleteEvent, printJobs } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [maxPrints, setMaxPrints] = useState(5);
  const [errors, setErrors] = useState<{ name?: boolean; date?: boolean }>({});
  const he = locale === 'he';

  const resetForm = () => {
    setName(''); setDate(''); setMaxPrints(5); setShowForm(false); setEditingId(null); setErrors({});
  };

  const handleSave = () => {
    const errs = { name: !name.trim(), date: !date };
    setErrors(errs);
    if (errs.name || errs.date) return;

    if (editingId) {
      updateEvent(editingId, { name, date, maxPrintsPerDevice: maxPrints });
    } else {
      addEvent({
        id: uuidv4(), name, date, maxPrintsPerDevice: maxPrints,
        active: true, createdAt: new Date().toISOString(),
      });
    }
    resetForm();
  };

  const startEdit = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setName(ev.name); setDate(ev.date); setMaxPrints(ev.maxPrintsPerDevice);
    setEditingId(id); setShowForm(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button className="btn-glow w-full mb-5" onClick={() => { resetForm(); setShowForm(true); }}>
        + {he ? 'אירוע חדש' : 'New Event'}
      </button>

      {/* Form */}
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

      {/* Events list */}
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
              <div className="text-xs text-white/40 mb-3">
                📸 {printJobs.filter((j) => j.eventId === event.id).length} {he ? 'תמונות' : 'photos'} · 📱 Max: {event.maxPrintsPerDevice}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary active:bg-primary/25"
                  onClick={() => setShowQR(showQR === event.id ? null : event.id)}>QR</button>
                <Link href={`/admin/event/${event.id}/qr`} className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-400 active:bg-purple-500/25">
                  {he ? 'עמוד QR' : 'QR Page'}
                </Link>
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 active:bg-blue-500/25"
                  onClick={() => startEdit(event.id)}>{he ? 'ערוך' : 'Edit'}</button>
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-white/8 text-white/60 active:bg-white/15"
                  onClick={() => updateEvent(event.id, { active: !event.active })}>{event.active ? '⏸' : '▶️'}</button>
                <button className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 active:bg-red-500/25"
                  onClick={() => { if (confirm('Delete?')) deleteEvent(event.id); }}>🗑️</button>
              </div>

              {/* Inline QR */}
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
  const { locale, overlays, addOverlay, removeOverlay } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const he = locale === 'he';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = uuidv4();

      try {
        const formData = new FormData();
        formData.append('overlay', file);
        formData.append('eventId', id);

        const res = await fetch('/api/upload-overlay', { method: 'POST', body: formData });
        const data = await res.json();

        addOverlay({
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          url: data.url || URL.createObjectURL(file),
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Fallback: save as data URL
        const reader = new FileReader();
        reader.onload = (ev) => {
          addOverlay({
            id,
            name: file.name.replace(/\.[^.]+$/, ''),
            url: ev.target?.result as string,
            createdAt: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(file);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <input ref={fileInputRef} type="file" accept="image/png" multiple className="hidden" onChange={handleUpload} />

      <button className="btn-glow w-full mb-5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? '⏳' : '+'} {he ? 'העלה מסגרות PNG' : 'Upload PNG Overlays'}
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {overlays.map((overlay, i) => (
          <motion.div key={overlay.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
            className="glass-card overflow-hidden group relative">
            {/* Preview with checkerboard */}
            <div className="aspect-[3/4] relative">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #252540 0% 50%)',
                backgroundSize: '12px 12px',
              }} />
              <img src={overlay.url} alt={overlay.name} className="relative w-full h-full object-contain p-1" />
            </div>
            <div className="p-2 flex items-center justify-between">
              <p className="text-xs font-bold text-white/70 truncate flex-1">{overlay.name}</p>
              <button
                className="w-7 h-7 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-xs active:bg-red-500/30 flex-shrink-0"
                onClick={() => { if (confirm(he ? 'למחוק?' : 'Delete?')) removeOverlay(overlay.id); }}
              >
                ✕
              </button>
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
  const { locale, events, printJobs, overlays } = useStore();
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);
  const he = locale === 'he';

  const photos = selectedEvent === 'all'
    ? printJobs
    : printJobs.filter((j) => j.eventId === selectedEvent);

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    setDownloading(true);

    try {
      // Simple download: create links for each photo
      // For real ZIP, we'd use JSZip - for now download individually
      for (const photo of photos) {
        const link = document.createElement('a');
        link.href = photo.compositeUrl || photo.photoUrl;
        link.download = `photo_${photo.id.slice(0, 8)}.jpg`;
        link.click();
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Event filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
            selectedEvent === 'all' ? 'bg-primary text-white' : 'bg-white/8 text-white/60'
          }`}
          onClick={() => setSelectedEvent('all')}
        >
          {he ? 'הכל' : 'All'} ({printJobs.length})
        </button>
        {events.map((ev) => {
          const count = printJobs.filter((j) => j.eventId === ev.id).length;
          return (
            <button key={ev.id}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                selectedEvent === ev.id ? 'bg-primary text-white' : 'bg-white/8 text-white/60'
              }`}
              onClick={() => setSelectedEvent(ev.id)}
            >
              {ev.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Download all */}
      {photos.length > 0 && (
        <button className="btn-secondary w-full mb-4" onClick={handleDownloadAll} disabled={downloading}>
          {downloading ? '⏳' : '📥'} {he ? `הורד הכל (${photos.length})` : `Download All (${photos.length})`}
        </button>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo, i) => {
          const event = events.find((e) => e.id === photo.eventId);
          const overlay = overlays.find((o) => o.id === photo.overlayId);
          return (
            <motion.div key={photo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="glass-card overflow-hidden">
              <div className="aspect-[3/4] relative bg-black">
                <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" />
                {overlay && (
                  <img src={overlay.url} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                )}
              </div>
              <div className="p-2">
                <p className="text-[10px] text-white/40 truncate">{event?.name}</p>
                <p className="text-[10px] text-white/30">{new Date(photo.createdAt).toLocaleTimeString()}</p>
              </div>
            </motion.div>
          );
        })}
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

// ===================== QR CODE DISPLAY =====================
function QRCodeDisplay({ eventId }: { eventId: string }) {
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = `${window.location.origin}/event/${eventId}`;
        const svg = await QRCode.toString(url, {
          type: 'svg', color: { dark: '#1a1a2e', light: '#ffffff' }, margin: 2, width: 200,
        });
        setQrSvg(svg);
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    };
    generateQR();
  }, [eventId]);

  if (!qrSvg) return <div className="w-[180px] h-[180px] mx-auto bg-gray-100 animate-pulse rounded-xl" />;
  return <div className="inline-block" dangerouslySetInnerHTML={{ __html: qrSvg }} />;
}
