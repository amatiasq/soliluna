import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useSigninCheck } from 'reactfire';

export function Login() {
  const auth = useAuth();

  const { status, data: signInCheckResult } = useSigninCheck();

  if (status === 'loading') {
    return <span>Cargando...</span>;
  }

  if (!signInCheckResult.signedIn) {
    signInWithRedirect(auth, new GoogleAuthProvider());
    return null;
  }

  return <Navigate to="/" />;
}
