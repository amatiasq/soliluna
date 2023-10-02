import {
  deleteDoc,
  doc,
  setDoc,
  SetOptions,
  UpdateData,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore, useFirestoreDocData } from 'reactfire';

// export function useAuth() {
//   const { status, data: signInCheckResult } = useSigninCheck();
// }

export function useFire<T>(path: string, ...pathSegments: string[]) {
  const firestore = useFirestore();
  const ref = doc<T, any>(firestore as any, path, ...pathSegments);
  const x = useFirestoreDocData<T>(ref);

  return {
    ...x,
    isLoading: x.status === 'loading',
    remove: () => deleteDoc(ref),
    set: (data: T, options?: SetOptions) =>
      options ? setDoc(ref, data, options) : setDoc(ref, data),
    update: (data: UpdateData<T>) => updateDoc(ref, data),
  };
}
