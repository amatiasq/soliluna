import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSigninCheck, useUser } from 'reactfire';
import { readEnvironmentVariable } from './readEnvironmentVariable';

const validUsers = readEnvironmentVariable<string[]>('VALID_USERS');

function RequireAuth({ children }: { children: JSX.Element }) {
  const { status, data: signInCheckResult } = useSigninCheck();
  const { data: user } = useUser();

  if (status === 'loading') {
    return <span>Loading</span>;
  }

  if (
    !signInCheckResult.signedIn ||
    !user ||
    !validUsers.includes(user.email!)
  ) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
}

export const withAuth = (el: JSX.Element) => <RequireAuth>{el}</RequireAuth>;
