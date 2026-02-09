import { useCallback } from 'react';
import { ulid } from 'ulid';
import type { Ingredient, Unit } from '@soliluna/shared';
import * as api from '../services/api';
import { useEntityList } from '../hooks/useEntity';
import { IngredientRow } from './IngredientRow';
import styles from './Pages.module.css';

/**
 * Full CRUD page for ingredients.
 * Each ingredient is rendered as an inline editable row that auto-saves on change.
 */
export function IngredientList() {
  const { data: ingredients, isLoading, error, refetch } = useEntityList<Ingredient>(
    'ingredients',
    api.getIngredients,
  );

  const handleAdd = useCallback(async () => {
    const newIngredient: Ingredient = {
      id: ulid(),
      name: '',
      pkgSize: 1,
      pkgUnit: 'kg' as Unit,
      pkgPrice: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await api.createIngredient({
        id: newIngredient.id,
        name: newIngredient.name || 'Nuevo ingrediente',
        pkgSize: newIngredient.pkgSize,
        pkgUnit: newIngredient.pkgUnit,
        pkgPrice: newIngredient.pkgPrice,
      });
      refetch();
    } catch {
      // Creation failed — user will see no new row appear
    }
  }, [refetch]);

  const handleDelete = useCallback(
    async (id: string) => {
      await api.deleteIngredient(id);
      refetch();
    },
    [refetch],
  );

  const handleUpdate = useCallback(() => {
    // IngredientRow handles its own auto-save via useAutoSave.
    // We only need a refetch if the parent list needs to reflect
    // name changes, but for now auto-save updates the row in place.
  }, []);

  if (isLoading) return <div className={styles.loading}>Cargando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ingredientes</h1>
        <button className={styles.addButton} onClick={handleAdd} title="Nuevo ingrediente">
          +
        </button>
      </div>

      {ingredients.map((ingredient) => (
        <IngredientRow
          key={ingredient.id}
          ingredient={ingredient}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}

      {ingredients.length === 0 && (
        <p className={styles.loading}>No hay ingredientes. Pulsa + para crear uno.</p>
      )}
    </div>
  );
}
