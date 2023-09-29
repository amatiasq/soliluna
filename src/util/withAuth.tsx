import { Navigate } from 'react-router-dom';
import { useAuth, useSigninCheck, useUser } from 'reactfire';
import { readEnvironmentVariable } from './readEnvironmentVariable';

const validUsers =
  readEnvironmentVariable<(string | undefined | null)[]>('VALID_USERS');

function RequireAuth({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  const { status, data: signInCheckResult } = useSigninCheck();
  const { data: user } = useUser();

  if (status === 'loading') {
    return <span>Cargando...</span>;
  }

  if (!signInCheckResult.signedIn) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: `${location}` }} />;
  }

  if (validUsers.includes(user?.email)) {
    return children;
  }

  const logout = () => {
    auth.signOut();
    location.reload();
  };

  return (
    <button style={{ fontSize: '3rem', fontWeight: 'bold' }} onClick={logout}>
      Who the fuck are you?
    </button>
  );
}

export const withAuth = (el: JSX.Element) => <RequireAuth>{el}</RequireAuth>;
