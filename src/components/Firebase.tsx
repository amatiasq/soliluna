import { FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { PropsWithChildren } from 'react';
import {
  AuthProvider,
  FirebaseAppProvider,
  FirestoreProvider,
  useFirebaseApp,
} from 'reactfire';

export interface FirebaseProps {
  config: FirebaseOptions;
}

export function Firebase({
  config,
  children,
}: PropsWithChildren<FirebaseProps>) {
  return (
    <FirebaseAppProvider firebaseConfig={config}>
      <FirebaseInternal>{children}</FirebaseInternal>
    </FirebaseAppProvider>
  );
}

interface FirebaseInternalProps {}

function FirebaseInternal({
  children,
}: PropsWithChildren<FirebaseInternalProps>) {
  const app = useFirebaseApp();
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  return (
    <AuthProvider sdk={auth}>
      <FirestoreProvider sdk={firestore}>{children}</FirestoreProvider>
    </AuthProvider>
  );
}
