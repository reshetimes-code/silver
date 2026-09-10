const BASE = '';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Most calls below used to just return res.json() with no res.ok check —
 * an HTTP error (404/500/etc) would silently resolve as if it succeeded,
 * so callers (and the admin page's error handling) never found out
 * anything went wrong. Route every call through this so a failed request
 * reliably throws with whatever message the API actually gave.
 */
async function handleJson(res: Response, fallback: string) {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || fallback);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

export const api = {
  // ===== Auth =====
  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleJson(res, 'Login failed');
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
    const result = await handleJson(res, 'Registration failed');
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
    const result = await handleJson(res, 'Google auth failed');
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
    return handleJson(res, 'Failed to load users');
  },

  async updateUser(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id, ...data }),
    });
    return handleJson(res, 'Failed to update user');
  },

  async deleteUser(id: string) {
    const res = await fetch(`${BASE}/api/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id }),
    });
    return handleJson(res, 'Failed to delete user');
  },

  // "Login as" — a super admin borrows another user's session to see the
  // app exactly as they do. The admin's own session is stashed under
  // impersonator-* so returnToAdmin() can restore it. If a session is
  // already stashed (i.e. we're already impersonating someone), this call
  // authenticates with *that* original admin token rather than whichever
  // (possibly non-admin) token is currently active — otherwise jumping
  // directly from user A to user B while already impersonating A would
  // authenticate as A, not as the real admin, and get rejected server-side.
  async loginAsUser(id: string) {
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    const stashedAdminToken = typeof window !== 'undefined' ? localStorage.getItem('impersonator-token') : null;
    const authToken = stashedAdminToken || activeToken;
    const res = await fetch(`${BASE}/api/users/${id}/impersonate`, {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await handleJson(res, 'Failed to log in as user');
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('impersonator-token')) {
        localStorage.setItem('impersonator-token', localStorage.getItem('auth-token') || '');
        localStorage.setItem('impersonator-user', localStorage.getItem('auth-user') || '');
      }
      localStorage.setItem('auth-token', data.token);
      localStorage.setItem('auth-user', JSON.stringify(data.user));
    }
    return data;
  },

  isImpersonating() {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('impersonator-token');
  },

  // Restores the stashed admin session. Returns false (and changes nothing)
  // if there was nothing to return to.
  returnToAdmin(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('impersonator-token');
    const user = localStorage.getItem('impersonator-user');
    if (!token || !user) return false;
    localStorage.setItem('auth-token', token);
    localStorage.setItem('auth-user', user);
    localStorage.removeItem('impersonator-token');
    localStorage.removeItem('impersonator-user');
    return true;
  },

  // ===== Events =====
  async getEvents() {
    const res = await fetch(`${BASE}/api/events`, { headers: authHeaders() });
    return handleJson(res, 'Failed to load events');
  },
  async getEvent(id: string) {
    const res = await fetch(`${BASE}/api/events/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
  async createEvent(data: { name: string; date: string; maxPrintsPerDevice: number; ownerId?: string }) {
    const res = await fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleJson(res, 'Failed to create event');
  },
  async updateEvent(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleJson(res, 'Failed to update event');
  },
  async deleteEvent(id: string) {
    const res = await fetch(`${BASE}/api/events/${id}`, { method: 'DELETE', headers: authHeaders() });
    return handleJson(res, 'Failed to delete event');
  },

  // ===== Overlays =====
  async getOverlays(eventId?: string, full = false) {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    if (full) params.set('full', 'true');
    const res = await fetch(`${BASE}/api/overlays?${params.toString()}`);
    return handleJson(res, 'Failed to load overlays');
  },
  getOverlayImageUrl(overlayId: string) {
    return `/api/overlays/${overlayId}/image`;
  },
  async uploadOverlay(file: File, name: string, eventId?: string) {
    const formData = new FormData();
    formData.append('overlay', file);
    formData.append('name', name);
    if (eventId) formData.append('eventId', eventId);
    const res = await fetch(`${BASE}/api/upload-overlay`, { method: 'POST', headers: authHeaders(), body: formData });
    return handleJson(res, 'Failed to upload frame');
  },
  async deleteOverlay(id: string) {
    const res = await fetch(`${BASE}/api/overlays/${id}`, { method: 'DELETE', headers: authHeaders() });
    return handleJson(res, 'Failed to delete frame');
  },
  async updateOverlay(id: string, data: { name?: string; eventId?: string | null }) {
    const res = await fetch(`${BASE}/api/overlays/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleJson(res, 'Failed to update frame');
  },

  // ===== Photos =====
  async getPhotos(eventId?: string) {
    const res = await fetch(`${BASE}/api/photos?eventId=${eventId || 'all'}`, { headers: authHeaders() });
    return handleJson(res, 'Failed to load photos');
  },
  async submitPhoto(data: { eventId: string; overlayId: string; image: string; rawImage?: string; deviceId: string; phoneNumber: string }) {
    const res = await fetch(`${BASE}/api/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return { error: err?.error, reason: err?.reason };
    }
    return res.json();
  },
  async updatePhoto(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleJson(res, 'Failed to update photo');
  },
  async deletePhoto(id: string) {
    const res = await fetch(`${BASE}/api/photos/${id}`, { method: 'DELETE', headers: authHeaders() });
    return handleJson(res, 'Failed to delete photo');
  },
  async deleteEventPhotos(eventId: string) {
    const photos = await api.getPhotos(eventId);
    for (const p of photos) {
      const res = await fetch(`${BASE}/api/photos/${p.id}`, { method: 'DELETE', headers: authHeaders() });
      await handleJson(res, 'Failed to delete photo');
    }
  },

  // ===== Leads =====
  async createLead(data: { name: string; phone: string; eventDate: string; eventId: string }) {
    const res = await fetch(`${BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleJson(res, 'Failed to save lead');
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
    return handleJson(res, 'Failed to update lead');
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
    const res = await fetch(`${BASE}/api/leads`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id }),
    });
    return handleJson(res, 'Failed to delete lead');
  },

  // ===== Dropbox (per-manager storage connection) =====
  async getDropboxStatus() {
    const res = await fetch(`${BASE}/api/dropbox/status`, { headers: authHeaders() });
    return handleJson(res, 'Failed to load Dropbox status');
  },
  async getDropboxConnectUrl(): Promise<{ url: string }> {
    const res = await fetch(`${BASE}/api/auth/dropbox/connect`, { headers: authHeaders() });
    return handleJson(res, 'Failed to start Dropbox connection');
  },
  async listDropboxFolders(path: string) {
    const res = await fetch(`${BASE}/api/dropbox/folders?path=${encodeURIComponent(path)}`, { headers: authHeaders() });
    return handleJson(res, 'Failed to load Dropbox folders');
  },
  async createDropboxFolder(parentPath: string, name: string) {
    const res = await fetch(`${BASE}/api/dropbox/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ parentPath, name }),
    });
    return handleJson(res, 'Failed to create Dropbox folder');
  },
  async selectDropboxFolder(path: string) {
    const res = await fetch(`${BASE}/api/dropbox/select-folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ path }),
    });
    return handleJson(res, 'Failed to select Dropbox folder');
  },
  async disconnectDropbox() {
    const res = await fetch(`${BASE}/api/dropbox/disconnect`, { method: 'DELETE', headers: authHeaders() });
    return handleJson(res, 'Failed to disconnect Dropbox');
  },

  // Print batch (Dropbox)
  async sendToPrint(photoIds: string[]) {
    const res = await fetch(`${BASE}/api/print-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ photoIds }),
    });
    return handleJson(res, 'Failed to send photos to print');
  },

  // Photo image URL
  getPhotoImageUrl(photoId: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/api/photos/${photoId}/image`;
  },
};
