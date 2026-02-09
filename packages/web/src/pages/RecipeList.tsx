import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ulid } from 'ulid';
import type { Recipe } from '@soliluna/shared';
import { formatCents } from '@soliluna/shared';
import * as api from '../services/api';
import { useEntityList } from '../hooks/useEntity';
import styles from './Pages.module.css';

/**
 * List page for recipes. Shows name, yield, and total cost.
 * Click on a recipe to navigate to its detail page.
 */
export function RecipeList() {
  const { data: recipes, isLoading, error, refetch } = useEntityList<Recipe>(
    'recipes',
    api.getRecipes,
  );
  const navigate = useNavigate();

  const handleAdd = useCallback(async () => {
    const id = ulid();
    try {
      await api.createRecipe({
        id,
        name: 'Nueva receta',
        yieldAmount: 1,
        yieldUnit: 'kg',
      });
      navigate(`/recipes/${id}`);
    } catch {
      // Creation failed — user stays on the list page
    }
  }, [navigate]);

  if (isLoading) return <div className={styles.loading}>Cargando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Recetas</h1>
        <button className={styles.addButton} onClick={handleAdd} title="Nueva receta">
          +
        </button>
      </div>

      {recipes.map((recipe) => (
        <Link key={recipe.id} to={`/recipes/${recipe.id}`} className={styles.listItem}>
          <span className={styles.listItemName}>{recipe.name}</span>
          <span className={styles.listItemMeta}>
            {recipe.yieldAmount} {recipe.yieldUnit}
          </span>
          <span className={styles.listItemMeta}>
            {formatCents(recipe.cost).replace('.', ',')}&nbsp;€
          </span>
        </Link>
      ))}

      {recipes.length === 0 && (
        <p className={styles.loading}>No hay recetas. Pulsa + para crear una.</p>
      )}
    </div>
  );
}
