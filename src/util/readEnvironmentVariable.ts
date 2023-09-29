const env: Record<string, string | undefined> = {
  FIREBASE_CONFIGURATION: import.meta.env.VITE_FIREBASE_CONFIGURATION,
  VALID_USERS: import.meta.env.VITE_VALID_USERS,
};

export function readEnvironmentVariable<T>(name: string): T {
  if (!(name in env)) {
    throw new Error(
      'Environment variable must be manually added to readEnvironmentVariable.ts: ' +
        name
    );
  }

  const value = env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is required!`);
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Environment variable ${name} can't be parsed!\n${error}`);
  }
}
