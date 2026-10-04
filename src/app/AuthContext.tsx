import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { toast } from 'sonner';
import type { UploadRecord, User } from '../types/app';
import { invalidAuthEvent } from '../services/api';

const storageKeys = {
  token: 'noted.token',
  user: 'noted.user',
  uploads: 'noted.uploads',
};

type AuthContextValue = {
  token: string;
  user: User | null;
  uploads: UploadRecord[];
  setUploads: Dispatch<SetStateAction<UploadRecord[]>>;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(): User | null {
  try {
    const stored = localStorage.getItem(storageKeys.user);
    return stored ? JSON.parse(stored) as User : null;
  } catch {
    return null;
  }
}

function readUploads(): UploadRecord[] {
  try {
    const stored = localStorage.getItem(storageKeys.uploads);
    return stored ? JSON.parse(stored) as UploadRecord[] : [];
  } catch {
    return [];
  }
}

function getTokenExpiration(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(paddedBase64)) as { exp?: unknown };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(storageKeys.token) ?? '');
  const [user, setUser] = useState<User | null>(readUser);
  const [uploads, setUploads] = useState<UploadRecord[]>(readUploads);

  const expireSession = useCallback(() => {
    localStorage.removeItem(storageKeys.token);
    localStorage.removeItem(storageKeys.user);
    setToken('');
    setUser(null);
    toast.error('Your session is invalid or has expired. Please sign in again.');
  }, []);

  useEffect(() => {
    if (!token) return;
    const expiration = getTokenExpiration(token);
    if (expiration === null || expiration <= Date.now()) {
      expireSession();
      return;
    }
    let timeout = 0;
    const checkExpiration = () => {
      const remaining = expiration - Date.now();
      if (remaining <= 0) {
        expireSession();
        return;
      }
      timeout = window.setTimeout(checkExpiration, Math.min(remaining, 2_147_000_000));
    };
    checkExpiration();
    return () => window.clearTimeout(timeout);
  }, [expireSession, token]);

  useEffect(() => {
    window.addEventListener(invalidAuthEvent, expireSession);
    return () => window.removeEventListener(invalidAuthEvent, expireSession);
  }, [expireSession]);

  useEffect(() => {
    localStorage.setItem(storageKeys.uploads, JSON.stringify(uploads));
  }, [uploads]);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    uploads,
    setUploads,
    signIn(nextToken, nextUser) {
      localStorage.setItem(storageKeys.token, nextToken);
      localStorage.setItem(storageKeys.user, JSON.stringify(nextUser));
      setToken(nextToken);
      setUser(nextUser);
      toast.success(`Welcome, ${nextUser.firstName?.trim() || 'student'}!`);
    },
    signOut() {
      localStorage.removeItem(storageKeys.token);
      localStorage.removeItem(storageKeys.user);
      setToken('');
      setUser(null);
      toast.success('You have been signed out.');
    },
  }), [token, user, uploads]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
