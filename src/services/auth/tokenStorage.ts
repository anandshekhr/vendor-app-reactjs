/**
 * Token handling.
 *
 * The backend issues bearer JWTs only (no httpOnly cookie flow), so tokens must live in JS-accessible storage.
 * To limit exposure, the short-lived access token is kept in memory only; the refresh token is persisted in
 * localStorage so a reload (or an offline POS start) does not force a new OTP. Logout and session expiry clear both.
 */
const REFRESH_KEY = 'tnbs.vendor.refresh';
const SESSION_KEY = 'tnbs.vendor.session';

let accessToken: string | null = null;

export interface StoredSession {
  userId: number | null;
  vendorId: number | null;
  phone: string;
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  getAccess: (): string | null => accessToken,
  setAccess: (token: string | null) => {
    accessToken = token;
  },
  getRefresh: (): string | null => safeStorage()?.getItem(REFRESH_KEY) ?? null,
  setRefresh: (token: string | null) => {
    const s = safeStorage();
    if (!s) return;
    if (token) s.setItem(REFRESH_KEY, token);
    else s.removeItem(REFRESH_KEY);
  },
  getSession: (): StoredSession | null => {
    const raw = safeStorage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  },
  setSession: (session: StoredSession | null) => {
    const s = safeStorage();
    if (!s) return;
    if (session) s.setItem(SESSION_KEY, JSON.stringify(session));
    else s.removeItem(SESSION_KEY);
  },
  clear: () => {
    accessToken = null;
    const s = safeStorage();
    s?.removeItem(REFRESH_KEY);
    s?.removeItem(SESSION_KEY);
  },
};

/** Decodes the `exp` claim without verifying (verification is the server's job). */
export function jwtExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
