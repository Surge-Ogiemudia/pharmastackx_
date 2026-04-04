'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User } from '@/types';

interface Session {
  user: User | null;
  isLoading: boolean;
  error: any;
  refreshSession: () => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/session');
      
      if (!response.ok) {
        setUser(null);
      } else {
        const data = await response.json();
        if (data && data.user && (data.user._id || data.user.id)) {
            setUser(data.user);
            // Persistent Cache for instant return
            localStorage.setItem('psx_cached_user', JSON.stringify(data.user));
            // Set/Refresh role cookie for server hints
            document.cookie = `psx_user_role=${data.user.role}; path=/; max-age=31536000; SameSite=Lax`;
        } else {
            setUser(null);
            localStorage.removeItem('psx_cached_user');
        }
      }
    } catch (fetchError) {
      setError(fetchError);
    } finally {
      // If we didn't have a user but revalidation finished, ensure we stop loading
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Phase 1: Instant Hydration from localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('psx_cached_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed._id || parsed.id)) {
            setUser(parsed);
            setIsLoading(false); // Enable instant UI rendering!
          }
        } catch (e) {
          console.error("Session Cache Parse Error:", e);
        }
      }
      
      // Fallback: Simple role cookie for very first load
      const roleCookie = document.cookie.split('; ').find(row => row.startsWith('psx_user_role='));
      if (roleCookie) {
        const role = roleCookie.split('=')[1];
        if (role) {
          setUser(prev => prev || ({ role } as any));
        }
      }
    }
    
    // Phase 2: Background Revalidation
    fetchSession();
  }, [fetchSession]);

  const refreshSession = useCallback(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    // 1. Optimistic UI: Clear local state immediately
    setUser(null);
    
    // 2. Clear role cookie and localStorage immediately
    if (typeof window !== 'undefined') {
      document.cookie = 'psx_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      localStorage.removeItem('psx_cached_user');
    }

    // 3. Fire-and-forget API logout
    fetch('/api/auth/logout', { method: 'POST' }).catch(err => {
      console.error('Background logout API failed:', err);
    });
    
    // Note: We don't await here because we want instant redirection 
    // handled by the component.
  }, []);

  const value = {
    user,
    isLoading,
    error,
    refreshSession,
    logout,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = (): Session => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
