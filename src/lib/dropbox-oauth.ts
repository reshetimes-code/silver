import { prisma, ensureDropboxAccountTable } from './db';

/**
 * Per-manager Dropbox OAuth: lets each account manager connect *their own*
 * Dropbox account (via Dropbox's official OAuth2 login — Dropbox has no
 * username/password API) and pick a destination folder for their events'
 * photos. This module owns all token/account plumbing; src/lib/dropbox.ts
 * keeps the photo-compositing/upload logic and calls into here for whichever
 * access token a given upload should use.
 */

const APP_KEY = process.env.DROPBOX_APP_KEY!;
const APP_SECRET = process.env.DROPBOX_APP_SECRET!;

// Minimum scopes needed to browse/create folders and upload photos, plus
// reading the connected account's email to show "Connected as ...".
const SCOPES = [
  'account_info.read',
  'files.metadata.read',
  'files.metadata.write',
  'files.content.write',
  'files.content.read',
].join(' ');

/**
 * Dropbox requires the `Dropbox-API-Arg` header value to be pure ASCII (HTTP
 * headers can't carry raw UTF-8/Unicode — the Fetch API throws
 * "Cannot convert argument to a ByteString" for any character above 255).
 * Event/folder names are often Hebrew or contain smart-quotes, so escape any
 * non-ASCII character as a unicode escape sequence — Dropbox's API parses
 * that back as normal JSON, decoding to the correct Unicode path server-side.
 * https://www.dropbox.com/developers/reference/json-encoding
 */
export function asciiSafeJson(obj: unknown): string {
  const nonAscii = new RegExp('[' + String.fromCharCode(128) + '-' + String.fromCharCode(65535) + ']', 'g');
  return JSON.stringify(obj).replace(nonAscii, (c) => {
    const hex = c.charCodeAt(0).toString(16);
    return String.fromCharCode(92) + 'u' + '0000'.slice(hex.length) + hex;
  });
}

/** Strip characters Dropbox path segments can't contain. */
export function sanitizeFolderName(name: string, fallback = 'Folder'): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim() || fallback;
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: APP_KEY,
    redirect_uri: redirectUri,
    response_type: 'code',
    token_access_type: 'offline', // required to get a refresh_token back
    scope: SCOPES,
    state,
  });
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: APP_KEY,
      client_secret: APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Dropbox token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

export async function refreshDropboxToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: APP_KEY,
      client_secret: APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Dropbox token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getCurrentAccount(accessToken: string): Promise<{ accountId: string; email: string; name: string }> {
  const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Dropbox get_current_account failed: ${await res.text()}`);
  const data = await res.json();
  return { accountId: data.account_id, email: data.email, name: data.name?.display_name || data.email };
}

/** Best-effort — a failed revoke shouldn't block disconnecting locally. */
export async function revokeDropboxToken(accessToken: string): Promise<void> {
  try {
    await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
  } catch (error) {
    console.error('Dropbox token revoke failed:', error);
  }
}

// Per-user short-lived access token cache, mirroring the single-value cache
// the shared-account flow uses in dropbox.ts — refreshed on demand, never
// persisted (only the long-lived refreshToken lives in the DB).
const userTokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

// Must be called right after a user's DropboxAccount row changes (connecting
// a *different* Dropbox account, or disconnecting) — otherwise this cache
// keeps serving the previous account's still-live access token for up to
// ~4 hours after the switch, silently uploading new photos to the old
// Dropbox account even though the DB (and the UI) already show the new one
// connected. Keyed by our own userId, not by Dropbox account, so it must be
// cleared explicitly rather than aging out on its own in this case.
export function invalidateUserTokenCache(userId: string): void {
  userTokenCache.delete(userId);
}

/**
 * Resolves the access token to use for a given account manager's own
 * Dropbox connection. Returns null if that user hasn't connected one yet —
 * callers should fall back to the shared env-configured account in that case.
 *
 * Never throws: callers in src/lib/dropbox.ts treat null as "fall back to
 * the shared account", so any lookup/refresh failure here (DB hiccup,
 * revoked token, etc.) must degrade to that same fallback rather than
 * blowing up event creation or photo uploads for everyone.
 */
export async function getAccessTokenForUser(userId: string | null | undefined): Promise<{ accessToken: string; rootFolderPath: string | null } | null> {
  if (!userId) return null;

  try {
    await ensureDropboxAccountTable();
    const account = await prisma.dropboxAccount.findUnique({ where: { userId } });
    if (!account) return null;

    const cached = userTokenCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return { accessToken: cached.accessToken, rootFolderPath: account.rootFolderPath };
    }

    const { accessToken, expiresIn } = await refreshDropboxToken(account.refreshToken);
    userTokenCache.set(userId, { accessToken, expiresAt: Date.now() + (expiresIn - 300) * 1000 });
    return { accessToken, rootFolderPath: account.rootFolderPath };
  } catch (error) {
    console.error(`Failed to resolve Dropbox access token for user ${userId}:`, error);
    return null;
  }
}

export interface DropboxFolderEntry {
  name: string;
  path: string;
}

// Thrown when Dropbox reports the requested path doesn't exist in the
// *currently connected* account — most commonly because the browser is
// still trying to browse a path (e.g. left over from before switching
// accounts) that only ever existed in a previously connected account.
// Callers can catch this specifically to fall back to root instead of
// surfacing it as a generic connection error.
export class DropboxPathNotFoundError extends Error {
  constructor(path: string) {
    super(`Dropbox path not found in the connected account: ${path || '(root)'}`);
    this.name = 'DropboxPathNotFoundError';
  }
}

/** Lists only the subfolders (not files) directly under `path` ("" = root). */
export async function listDropboxFolder(accessToken: string, path: string): Promise<DropboxFolderEntry[]> {
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: asciiSafeJson({ path, limit: 500 }),
  });
  if (!res.ok) {
    const bodyText = await res.text();
    if (bodyText.includes('path/not_found') || bodyText.includes('path_lookup/not_found')) {
      throw new DropboxPathNotFoundError(path);
    }
    throw new Error(`Dropbox list_folder failed: ${bodyText}`);
  }
  const data = await res.json();
  return (data.entries as Array<{ '.tag': string; name: string; path_display: string }>)
    .filter((e) => e['.tag'] === 'folder')
    .map((e) => ({ name: e.name, path: e.path_display }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Creates `name` under `parentPath`; reuses the folder if it already exists. */
export async function createDropboxFolder(accessToken: string, parentPath: string, name: string): Promise<string> {
  const safeName = sanitizeFolderName(name);
  const fullPath = `${parentPath === '/' ? '' : parentPath}/${safeName}`;

  const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: asciiSafeJson({ path: fullPath, autorename: false }),
  });

  if (res.ok) {
    const data = await res.json();
    return data.metadata.path_display || fullPath;
  }

  const err = await res.json().catch(() => null);
  if (err?.error?.['.tag'] === 'path' && err.error.path?.['.tag'] === 'conflict') {
    return fullPath; // already exists — reuse it
  }
  throw new Error(`Dropbox create_folder_v2 failed: ${JSON.stringify(err)}`);
}
