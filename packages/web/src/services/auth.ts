interface User {
  email: string;
}

export async function checkSession(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me');
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function loginWithGoogle(credential: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || 'Login failed');
  }

  const json = await res.json();
  return json.data;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getAuthConfig(): Promise<{ clientId: string }> {
  const res = await fetch('/api/auth/config');
  const json = await res.json();
  return json.data;
}
