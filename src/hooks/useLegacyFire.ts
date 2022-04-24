import {
  orderByChild,
  query as queryDatabase,
  ref as getRef,
} from 'firebase/database';
import {
  useDatabase,
  useDatabaseListData,
  useDatabaseObjectData,
} from 'reactfire';

export function useLegacyFire(path: string) {
  const database = useDatabase();
  const ref = getRef(database, path);

  return {
    ...useDatabaseObjectData(ref),
    ref,
  };
}

export function useLegacyFireList(
  collectionName: string,
  {
    idField = 'id',
    sortBy,
  }: {
    idField?: string;
    sortBy?: string;
  } = {}
) {
  const database = useDatabase();
  const ref = getRef(database, collectionName);
  const query = sortBy
    ? queryDatabase(ref, orderByChild(sortBy))
    : queryDatabase(ref);

  return {
    ...useDatabaseListData(query, { idField }),
  };
}
