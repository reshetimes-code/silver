const BASE = '';

export const api = {
  // Events
  async getEvents() {
    const res = await fetch(`${BASE}/api/events`);
    return res.json();
  },
  async getEvent(id: string) {
    const res = await fetch(`${BASE}/api/events/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
  async createEvent(data: { name: string; date: string; maxPrintsPerDevice: number }) {
    const res = await fetch(`${BASE}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  },
  async updateEvent(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  },
  async deleteEvent(id: string) {
    await fetch(`${BASE}/api/events/${id}`, { method: 'DELETE' });
  },

  // Overlays
  async getOverlays() {
    const res = await fetch(`${BASE}/api/overlays`);
    return res.json();
  },
  async uploadOverlay(file: File, name: string) {
    const formData = new FormData();
    formData.append('overlay', file);
    formData.append('name', name);
    const res = await fetch(`${BASE}/api/upload-overlay`, { method: 'POST', body: formData });
    return res.json();
  },
  async deleteOverlay(id: string) {
    await fetch(`${BASE}/api/overlays/${id}`, { method: 'DELETE' });
  },

  // Photos
  async getPhotos(eventId?: string) {
    const res = await fetch(`${BASE}/api/photos?eventId=${eventId || 'all'}`);
    return res.json();
  },
  async submitPhoto(data: { eventId: string; overlayId: string; image: string; deviceId: string; phoneNumber: string }) {
    const res = await fetch(`${BASE}/api/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) {
      const err = await res.json();
      return { error: err.error, reason: err.reason };
    }
    return res.json();
  },
  async updatePhoto(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/photos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  },
  async deletePhoto(id: string) {
    await fetch(`${BASE}/api/photos/${id}`, { method: 'DELETE' });
  },
  async deleteEventPhotos(eventId: string) {
    const photos = await api.getPhotos(eventId);
    for (const p of photos) {
      await fetch(`${BASE}/api/photos/${p.id}`, { method: 'DELETE' });
    }
  },

  // Print batch (Dropbox)
  async sendToPrint(photoIds: string[]) {
    const res = await fetch(`${BASE}/api/print-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds }),
    });
    return res.json();
  },

  // Photo image URL (for sharing)
  getPhotoImageUrl(photoId: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/api/photos/${photoId}/image`;
  },
};
