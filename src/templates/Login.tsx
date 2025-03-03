import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { Navigate } from 'react-router-dom';
import { useAuth, useSigninCheck } from 'reactfire';

export function Login() {
  const auth = useAuth();

  const { status, data: signInCheckResult } = useSigninCheck();

  if (status === 'loading') {
    return <span>Cargando...</span>;
  }

  if (!signInCheckResult.signedIn) {
    signInWithPopup(auth, new GoogleAuthProvider());
    return null;
  }

  return <Navigate to="/" />;
}
