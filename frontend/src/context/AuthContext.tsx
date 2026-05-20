import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearApiCache } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  currencyCode: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateUser = React.useCallback((nextUser: User | null) => {
    setUser((currentUser) => {
      if (!nextUser || currentUser?.id !== nextUser.id) {
        clearApiCache();
      }

      return nextUser;
    });
  }, []);

  useEffect(() => {
    // Check session on mount
    fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => updateUser(data.user))
      .catch(() => updateUser(null))
      .finally(() => setIsLoading(false));
  }, [updateUser]);

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      updateUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser: updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
