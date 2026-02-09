import { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ulid } from 'ulid';
import type { Dish } from '@soliluna/shared';
import { formatCents } from '@soliluna/shared';
import * as api from '../services/api';
import { useEntityList } from '../hooks/useEntity';
import styles from './Pages.module.css';

/**
 * Sorts dishes: null delivery date first, then by date descending.
 */
function sortDishes(dishes: Dish[]): Dish[] {
  return [...dishes].sort((a, b) => {
    if (a.deliveryDate === null && b.deliveryDate !== null) return -1;
    if (a.deliveryDate !== null && b.deliveryDate === null) return 1;
    if (a.deliveryDate === null && b.deliveryDate === null) return 0;
    return b.deliveryDate!.localeCompare(a.deliveryDate!);
  });
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Sin fecha';
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * List page for dishes. Shows name, date, PAX, and final price.
 */
export function DishList() {
  const { data: rawDishes, isLoading, error } = useEntityList<Dish>(
    'dishes',
    api.getDishes,
  );
  const navigate = useNavigate();

  const dishes = useMemo(() => sortDishes(rawDishes), [rawDishes]);

  const handleAdd = useCallback(async () => {
    const id = ulid();
    try {
      await api.createDish({
        id,
        name: 'Nuevo plato',
        pax: 1,
        deliveryDate: null,
        notes: '',
        multiplier: 1,
      });
      navigate(`/dishes/${id}`);
    } catch {
      // Creation failed — user stays on the list page
    }
  }, [navigate]);

  if (isLoading) return <div className={styles.loading}>Cargando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Platos</h1>
        <button className={styles.addButton} onClick={handleAdd} title="Nuevo plato">
          +
        </button>
      </div>

      {dishes.map((dish) => (
        <Link key={dish.id} to={`/dishes/${dish.id}`} className={styles.listItem}>
          <span className={styles.listItemName}>{dish.name}</span>
          <span className={styles.listItemMeta}>{formatDate(dish.deliveryDate)}</span>
          <span className={styles.listItemMeta}>{dish.pax} PAX</span>
          <span className={styles.listItemMeta}>
            {formatCents(dish.finalPrice).replace('.', ',')}&nbsp;€
          </span>
        </Link>
      ))}

      {dishes.length === 0 && (
        <p className={styles.loading}>No hay platos. Pulsa + para crear uno.</p>
      )}
    </div>
  );
}
