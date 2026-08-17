const BASE = '';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // ===== Auth =====
  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-token', data.token);
      localStorage.setItem('auth-user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(data: { email: string; password: string; name: string; phone?: string }) {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const result = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-token', result.token);
      localStorage.setItem('auth-user', JSON.stringify(result.user));
    }
    return result;
  },

  async googleAuth(credential: string) {
    const res = await fetch(`${BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google auth failed');
    }
    const result = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-token', result.token);
      localStorage.setItem('auth-user', JSON.stringify(result.user));
    }
    return result;
  },

  async getMe() {
    const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('auth-user');
      sessionStorage.removeItem('admin-auth');
    }
  },

  getStoredUser() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('auth-user');
    return raw ? JSON.parse(raw) : null;
  },

  getStoredToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth-token');
  },

  // ===== Users (super admin) =====
  async getUsers() {
    const res = await fetch(`${BASE}/api/users`, { headers: authHeaders() });
    return res.json();
  },

  async updateUser(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },

  // ===== Events =====
  async getEvents() {
    const res = await fetch(`${BASE}/api/events`, { headers: authHeaders() });
    return res.json();
  },
  async getEvent(id: string) {
    const res = await fetch(`${BASE}/api/events/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
  async createEvent(data: { name: string; date: string; maxPrintsPerDevice: number }) {
    const res = await fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateEvent(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteEvent(id: string) {
    await fetch(`${BASE}/api/events/${id}`, { method: 'DELETE', headers: authHeaders() });
  },

  // ===== Overlays =====
  async getOverlays(eventId?: string, full = false) {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    if (full) params.set('full', 'true');
    const res = await fetch(`${BASE}/api/overlays?${params.toString()}`);
    return res.json();
  },
  getOverlayImageUrl(overlayId: string) {
    return `/api/overlays/${overlayId}/image`;
  },
  async uploadOverlay(file: File, name: string, eventId?: string) {
    const formData = new FormData();
    formData.append('overlay', file);
    formData.append('name', name);
    if (eventId) formData.append('eventId', eventId);
    const res = await fetch(`${BASE}/api/upload-overlay`, { method: 'POST', body: formData });
    return res.json();
  },
  async deleteOverlay(id: string) {
    await fetch(`${BASE}/api/overlays/${id}`, { method: 'DELETE' });
  },

  // ===== Photos =====
  async getPhotos(eventId?: string) {
    const res = await fetch(`${BASE}/api/photos?eventId=${eventId || 'all'}`);
    return res.json();
  },
  async submitPhoto(data: { eventId: string; overlayId: string; image: string; deviceId: string; phoneNumber: string }) {
    const res = await fetch(`${BASE}/api/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      return { error: err.error, reason: err.reason };
    }
    return res.json();
  },
  async updatePhoto(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
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

  // ===== Leads =====
  async createLead(data: { name: string; phone: string; eventDate: string; eventId: string }) {
    const res = await fetch(`${BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getLeads() {
    const res = await fetch(`${BASE}/api/leads`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async updateLead(id: string, data: { handled: boolean }) {
    const res = await fetch(`${BASE}/api/leads`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },

  async checkLeadExists(phone: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/api/leads?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.exists;
    } catch {
      return false;
    }
  },

  async deleteLead(id: string) {
    await fetch(`${BASE}/api/leads`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id }),
    });
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

  // Photo image URL
  getPhotoImageUrl(photoId: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/api/photos/${photoId}/image`;
  },
};
