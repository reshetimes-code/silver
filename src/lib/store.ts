import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from './i18n';

export interface Overlay {
  id: string;
  name: string;
  url: string; // path to PNG file or data URL
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  maxPrintsPerDevice: number;
  active: boolean;
  createdAt: string;
}

export interface PrintJob {
  id: string;
  eventId: string;
  photoUrl: string;
  overlayId: string;
  compositeUrl?: string; // final photo with overlay
  deviceId: string;
  status: 'pending' | 'printed' | 'error';
  createdAt: string;
}

interface AppState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;

  // Global overlays library
  overlays: Overlay[];
  addOverlay: (overlay: Overlay) => void;
  removeOverlay: (id: string) => void;

  // Events
  events: Event[];
  addEvent: (event: Event) => void;
  updateEvent: (id: string, data: Partial<Event>) => void;
  deleteEvent: (id: string) => void;

  // Print jobs / photos
  printJobs: PrintJob[];
  addPrintJob: (job: PrintJob) => void;
  getEventPhotos: (eventId: string) => PrintJob[];

  // Device print tracking
  devicePrints: Record<string, Record<string, number>>;
  incrementDevicePrints: (eventId: string, deviceId: string) => void;
  getDevicePrintCount: (eventId: string, deviceId: string) => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set((s) => ({ locale: s.locale === 'en' ? 'he' : 'en' })),

      // Overlays
      overlays: [],
      addOverlay: (overlay) => set((s) => ({ overlays: [...s.overlays, overlay] })),
      removeOverlay: (id) => set((s) => ({ overlays: s.overlays.filter((o) => o.id !== id) })),

      // Events
      events: [],
      addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
      updateEvent: (id, data) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...data } : e)) })),
      deleteEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      // Print jobs
      printJobs: [],
      addPrintJob: (job) => set((s) => ({ printJobs: [...s.printJobs, job] })),
      getEventPhotos: (eventId) => get().printJobs.filter((j) => j.eventId === eventId),

      // Device prints
      devicePrints: {},
      incrementDevicePrints: (eventId, deviceId) =>
        set((s) => {
          const dp = { ...s.devicePrints };
          if (!dp[eventId]) dp[eventId] = {};
          dp[eventId][deviceId] = (dp[eventId][deviceId] || 0) + 1;
          return { devicePrints: dp };
        }),
      getDevicePrintCount: (eventId, deviceId) => {
        const dp = get().devicePrints;
        return dp[eventId]?.[deviceId] || 0;
      },
    }),
    {
      name: 'photobooth-storage',
      version: 2,
      migrate: () => ({
        // Clear old data on version change
        locale: 'en' as Locale,
        overlays: [],
        events: [],
        printJobs: [],
        devicePrints: {},
      }),
    }
  )
);
