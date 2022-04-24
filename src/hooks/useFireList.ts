import {
  addDoc,
  collection,
  CollectionReference,
  deleteDoc,
  doc,
  orderBy as orderByField,
  Query,
  query as queryFirestore,
} from 'firebase/firestore';
import { useFirestore, useFirestoreCollectionData } from 'reactfire';

export function useFireList<T>(
  path: string,
  {
    pathSegments = [],
    idField = 'id',
    orderBy,
    orderByDesc = false,
  }: {
    pathSegments?: string[];
    idField?: string;
    orderBy?: string;
    orderByDesc?: boolean;
  } = {}
) {
  const firestore = useFirestore();

  const col = collection(
    firestore,
    path,
    ...pathSegments
  ) as CollectionReference<T>;

  const query = orderBy
    ? queryFirestore(col, orderByField(orderBy, orderByDesc ? 'desc' : 'asc'))
    : queryFirestore(col);

  const x = useFirestoreCollectionData<T>(query as Query<T>, { idField });

  return {
    ...x,
    isLoading: x.status === 'loading',
    col,
    add: (x: Omit<T, 'id'>) => addDoc<T>(col, x as T),
    remove: (x: T) =>
      deleteDoc(doc<T>(firestore as any, path, (x as any)[idField])),
  };
}
