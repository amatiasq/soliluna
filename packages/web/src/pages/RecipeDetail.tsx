import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type {
  Recipe,
  Ingredient,
  IngredientUsageResolved,
  RecipeUnit,
} from '@soliluna/shared';
import { calculateIngredientCost } from '@soliluna/shared';
import * as api from '../services/api';
import { saveWithOfflineFallback } from '../services/cache';
import { useAutoSave } from '../hooks/useAutoSave';
import { useEntityList, useEntity } from '../hooks/useEntity';
import { SaveIndicator } from '../components/SaveIndicator';
import { CostDisplay } from '../components/CostDisplay';
import { DeleteButton } from '../components/DeleteButton';
import { NumberInput } from '../components/NumberInput';
import { UnitSelect } from '../components/UnitSelect';
import styles from './Pages.module.css';

/**
 * Detail/edit page for a single recipe.
 * Top section: name, yield amount, yield unit (all auto-saved).
 * Ingredients section: add/remove ingredients with cost calculation.
 */
export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch recipe and ingredient catalog with cache support
  const {
    data: recipe,
    isLoading: recipeLoading,
    error: recipeError,
  } = useEntity<Recipe>('recipes', id, () => api.getRecipe(id!));

  const {
    data: allIngredients,
    isLoading: ingredientsLoading,
  } = useEntityList<Ingredient>('ingredients', api.getIngredients);

  // Track the latest recipe from server (for updatedAt conflict detection)
  const [latestRecipe, setLatestRecipe] = useState<Recipe | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [yieldAmount, setYieldAmount] = useState(1);
  const [yieldUnit, setYieldUnit] = useState<RecipeUnit>('kg');
  const [ingredients, setIngredients] = useState<IngredientUsageResolved[]>([]);

  // Populate editable fields once the recipe loads
  useEffect(() => {
    if (!recipe) return;
    setLatestRecipe(recipe);
    setName(recipe.name);
    setYieldAmount(recipe.yieldAmount);
    setYieldUnit(recipe.yieldUnit);
    setIngredients(recipe.ingredients);
  }, [recipe]);

  // Recalculate costs client-side when ingredients change
  const ingredientsWithCost = useMemo(() => {
    return ingredients.map((usage) => {
      const catalogIngredient = allIngredients.find((i) => i.id === usage.ingredientId);
      if (!catalogIngredient) return usage;

      const cost = calculateIngredientCost(catalogIngredient, usage.amount, usage.unit);
      return { ...usage, name: catalogIngredient.name, cost };
    });
  }, [ingredients, allIngredients]);

  const totalCost = useMemo(
    () => ingredientsWithCost.reduce((sum, ing) => sum + Math.max(0, ing.cost), 0),
    [ingredientsWithCost],
  );

  // Auto-save form values
  const formValues = useMemo(
    () => ({
      name,
      yieldAmount,
      yieldUnit,
      ingredients: ingredients.map(({ ingredientId, amount, unit }) => ({
        ingredientId,
        amount,
        unit,
      })),
    }),
    [name, yieldAmount, yieldUnit, ingredients],
  );

  const handleSave = useCallback(
    async (values: typeof formValues): Promise<void | 'offline'> => {
      if (!id || !latestRecipe || !values.name.trim()) return;

      const updateBody = {
        name: values.name,
        yieldAmount: values.yieldAmount,
        yieldUnit: values.yieldUnit,
        ingredients: values.ingredients,
        updatedAt: latestRecipe.updatedAt,
      };

      // Build an optimistic Recipe for local cache
      const optimisticRecipe: Recipe = {
        ...latestRecipe,
        name: values.name,
        yieldAmount: values.yieldAmount,
        yieldUnit: values.yieldUnit,
        ingredients: ingredientsWithCost,
        cost: totalCost,
        updatedAt: new Date().toISOString(),
      };

      const result = await saveWithOfflineFallback(
        'recipes',
        optimisticRecipe,
        'PUT',
        `/api/recipes/${id}`,
        updateBody,
        async () => {
          const updated = await api.updateRecipe(id, updateBody);
          setLatestRecipe(updated);
        },
      );

      if (result === 'offline') return 'offline';
    },
    [id, latestRecipe, ingredientsWithCost, totalCost],
  );

  const saveState = useAutoSave(formValues, handleSave);

  const handleAddIngredient = useCallback(() => {
    if (allIngredients.length === 0) return;

    const firstIngredient = allIngredients[0];
    setIngredients((prev) => [
      ...prev,
      {
        ingredientId: firstIngredient.id,
        amount: 1,
        unit: firstIngredient.pkgUnit,
        name: firstIngredient.name,
        cost: 0,
      },
    ]);
  }, [allIngredients]);

  const handleRemoveIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleIngredientChange = useCallback(
    (index: number, field: string, value: string | number) => {
      setIngredients((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;

          if (field === 'ingredientId') {
            const catalogIngredient = allIngredients.find((ing) => ing.id === value);
            return {
              ...item,
              ingredientId: value as string,
              name: catalogIngredient?.name ?? item.name,
              unit: catalogIngredient?.pkgUnit ?? item.unit,
            };
          }

          return { ...item, [field]: value };
        }),
      );
    },
    [allIngredients],
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await api.deleteRecipe(id);
    navigate('/recipes');
  }, [id, navigate]);

  const loading = recipeLoading || ingredientsLoading;
  if (loading) return <div className={styles.loading}>Cargando...</div>;
  if (recipeError) return <div className={styles.error}>{recipeError}</div>;
  if (!recipe) return <div className={styles.error}>Receta no encontrada</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <Link to="/recipes" className={styles.backLink}>
          ← Recetas
        </Link>
        <SaveIndicator state={saveState} />
      </div>

      {/* Recipe metadata */}
      <div className={styles.formRow}>
        <input
          className={styles.inputName}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre de la receta"
        />
        <NumberInput
          className={styles.inputNumber}
          value={yieldAmount}
          onChange={setYieldAmount}
          min={0}
          step="any"
          placeholder="Cantidad"
        />
        <UnitSelect
          className={styles.select}
          value={yieldUnit}
          onChange={(value) => setYieldUnit(value as RecipeUnit)}
          kind="recipe"
        />
      </div>

      {/* Cost display */}
      <div className={styles.costSummary}>
        <div className={styles.costRow}>
          <span>Coste total:</span>
          <CostDisplay cents={totalCost} />
        </div>
      </div>

      {/* Ingredients section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ingredientes</h2>
          <button className={styles.addButton} onClick={handleAddIngredient} title="Nuevo ingrediente">
            +
          </button>
        </div>

        {ingredientsWithCost.map((usage, index) => (
          <div key={index} className={styles.formRow}>
            <select
              className={styles.select}
              value={usage.ingredientId}
              onChange={(event) => handleIngredientChange(index, 'ingredientId', event.target.value)}
            >
              {allIngredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
            <NumberInput
              className={styles.inputNumber}
              value={usage.amount}
              onChange={(value) => handleIngredientChange(index, 'amount', value)}
              min={0}
              step="any"
              placeholder="Cantidad"
            />
            <UnitSelect
              className={styles.select}
              value={usage.unit}
              onChange={(value) => handleIngredientChange(index, 'unit', value)}
              kind="ingredient"
            />
            <CostDisplay cents={usage.cost} />
            <button
              className={styles.deleteInline}
              onClick={() => handleRemoveIngredient(index)}
              title="Eliminar"
            >
              ✗
            </button>
          </div>
        ))}

        {ingredientsWithCost.length === 0 && (
          <p className={styles.loading}>Sin ingredientes. Pulsa + para añadir.</p>
        )}
      </div>

      {/* Danger zone */}
      <div className={styles.dangerZone}>
        <DeleteButton onDelete={handleDelete} label="Eliminar receta" />
      </div>
    </div>
  );
}
