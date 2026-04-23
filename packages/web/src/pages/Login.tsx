import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAuthConfig } from '../services/auth';
import styles from './Login.module.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; text?: string; locale?: string },
          ) => void;
        };
      };
    };
  }
}

export function Login() {
  const { login } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loginRef = useRef(login);
  loginRef.current = login;

  const handleCredential = useCallback(async (response: { credential: string }) => {
    try {
      setLoading(true);
      setError(null);
      await loginRef.current(response.credential);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Error de autenticación');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAuthConfig().then(({ clientId }) => {
      if (cancelled || !buttonRef.current) return;

      function initGSI() {
        if (!window.google || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          locale: 'es',
        });
      }

      if (window.google?.accounts) {
        initGSI();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = initGSI;
      document.head.appendChild(script);
    });

    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Soliluna</h1>
      {loading && <p className={styles.info}>Verificando...</p>}
      {error && <p className={styles.error}>{error}</p>}
      <div ref={buttonRef} />
    </div>
  );
}
