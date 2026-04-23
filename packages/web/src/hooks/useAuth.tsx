import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { checkSession, loginWithGoogle, logout as apiLogout } from '../services/auth';

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; email: string }
  | { status: 'unauthenticated' };

interface AuthContextValue {
  auth: AuthState;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    checkSession().then((user) => {
      setAuth(
        user ? { status: 'authenticated', email: user.email } : { status: 'unauthenticated' },
      );
    });
  }, []);

  const login = useCallback(async (credential: string) => {
    const user = await loginWithGoogle(credential);
    setAuth({ status: 'authenticated', email: user.email });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuth({ status: 'unauthenticated' });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
