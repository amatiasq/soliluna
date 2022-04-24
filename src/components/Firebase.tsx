import { FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import React, { PropsWithChildren } from 'react';
import {
  FirebaseAppProvider,
  FirestoreProvider,
  useFirebaseApp,
} from 'reactfire';

export interface FirebaseInternalProps {}

function FirebaseInternal({
  children,
}: PropsWithChildren<FirebaseInternalProps>) {
  const firestoreInstance = getFirestore(useFirebaseApp());
  return (
    <FirestoreProvider sdk={firestoreInstance}>{children}</FirestoreProvider>
  );
}

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
