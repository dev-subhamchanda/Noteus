import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { toast } from 'sonner';
import type { UploadRecord, User } from '../types/app';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(storageKeys.token) ?? '');
  const [user, setUser] = useState<User | null>(readUser);
  const [uploads, setUploads] = useState<UploadRecord[]>(readUploads);

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
