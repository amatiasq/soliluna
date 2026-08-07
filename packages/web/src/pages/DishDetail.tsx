import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type {
  Dish,
  Ingredient,
  Recipe,
  IngredientUsageResolved,
  RecipeUsageResolved,
  RecipeUnit,
  Multiplier,
  Unit,
} from '@soliluna/shared';
import { calculateIngredientCost, calculateRecipeCost, MultiplierValues } from '@soliluna/shared';
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

const TO_GRAMS: Partial<Record<Unit, number>> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
};

function formatAmount(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  return parseFloat(value.toFixed(1)).toString();
}

function loadChecks(dishId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`dish-checks-${dishId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecks(dishId: string, checks: Set<string>): void {
  localStorage.setItem(`dish-checks-${dishId}`, JSON.stringify([...checks]));
}

export function DishDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: dish,
    isLoading: dishLoading,
    error: dishError,
  } = useEntity<Dish>('dishes', id, () => api.getDish(id!));

  const {
    data: allIngredients,
    isLoading: ingredientsLoading,
  } = useEntityList<Ingredient>('ingredients', api.getIngredients);

  const {
    data: allRecipes,
    isLoading: recipesLoading,
  } = useEntityList<Recipe>('recipes', api.getRecipes);

  // For the updatedAt conflict check.
  const [latestDish, setLatestDish] = useState<Dish | null>(null);

  const [name, setName] = useState('');
  const [pax, setPax] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const [ingredients, setIngredients] = useState<IngredientUsageResolved[]>([]);
  const [recipes, setRecipes] = useState<RecipeUsageResolved[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(() => loadChecks(id ?? ''));

  const toggleCheck = useCallback(
    (key: string) => {
      setCheckedIngredients((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        if (id) saveChecks(id, next);
        return next;
      });
    },
    [id],
  );

  useEffect(() => {
    if (!dish) return;
    setLatestDish(dish);
    setName(dish.name);
    setPax(dish.pax);
    setDeliveryDate(dish.deliveryDate ?? '');
    setNotes(dish.notes);
    setMultiplier(dish.multiplier as Multiplier);
    setIngredients(dish.ingredients);
    setRecipes(dish.recipes);
  }, [dish]);

  const ingredientsWithCost = useMemo(() => {
    return ingredients.map((usage) => {
      const catalogIngredient = allIngredients.find((i) => i.id === usage.ingredientId);
      if (!catalogIngredient) return usage;

      const cost = calculateIngredientCost(catalogIngredient, usage.amount, usage.unit);
      return { ...usage, name: catalogIngredient.name, cost };
    });
  }, [ingredients, allIngredients]);

  const recipesWithCost = useMemo(() => {
    return recipes.map((usage) => {
      const catalogRecipe = allRecipes.find((r) => r.id === usage.recipeId);
      if (!catalogRecipe) return usage;

      const cost = calculateRecipeCost(catalogRecipe, usage.amount);
      return { ...usage, name: catalogRecipe.name, cost };
    });
  }, [recipes, allRecipes]);

  // Los no calculables cuentan como cero, y aparte para poder avisar.
  const { ingredientsCost, missingCost } = useMemo(() => {
    let total = 0;
    let missing = 0;

    for (const ing of ingredientsWithCost) {
      if (ing.cost === null) missing++;
      else total += ing.cost;
    }

    return { ingredientsCost: total, missingCost: missing };
  }, [ingredientsWithCost]);

  const recipesCost = useMemo(
    () => recipesWithCost.reduce((sum, rec) => sum + (rec.cost ?? 0), 0),
    [recipesWithCost],
  );

  const baseCost = ingredientsCost + recipesCost;
  const finalPrice = baseCost * multiplier;

  const formValues = useMemo(
    () => ({
      name,
      pax,
      deliveryDate: deliveryDate || null,
      notes,
      multiplier,
      ingredients: ingredients.map(({ ingredientId, amount, unit }) => ({
        ingredientId,
        amount,
        unit,
      })),
      recipes: recipes.map(({ recipeId, amount, unit }) => ({
        recipeId,
        amount,
        unit,
      })),
    }),
    [name, pax, deliveryDate, notes, multiplier, ingredients, recipes],
  );

  const handleSave = useCallback(
    async (values: typeof formValues): Promise<void | 'offline'> => {
      if (!id || !latestDish || !values.name.trim()) return;

      const updateBody = {
        name: values.name,
        pax: values.pax,
        deliveryDate: values.deliveryDate,
        notes: values.notes,
        multiplier: values.multiplier,
        ingredients: values.ingredients,
        recipes: values.recipes,
        updatedAt: latestDish.updatedAt,
      };

      const optimisticDish: Dish = {
        ...latestDish,
        name: values.name,
        pax: values.pax,
        deliveryDate: values.deliveryDate,
        notes: values.notes,
        multiplier: values.multiplier,
        ingredients: ingredientsWithCost,
        recipes: recipesWithCost,
        baseCost,
        finalPrice,
        updatedAt: new Date().toISOString(),
      };

      const result = await saveWithOfflineFallback(
        'dishes',
        optimisticDish,
        'PUT',
        `/api/dishes/${id}`,
        updateBody,
        async () => {
          const updated = await api.updateDish(id, updateBody);
          setLatestDish(updated);
        },
      );

      if (result === 'offline') return 'offline';
    },
    [id, latestDish, ingredientsWithCost, recipesWithCost, baseCost, finalPrice],
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

  const handleAddRecipe = useCallback(() => {
    if (allRecipes.length === 0) return;

    const firstRecipe = allRecipes[0];
    setRecipes((prev) => [
      ...prev,
      {
        recipeId: firstRecipe.id,
        amount: 1,
        unit: 'PAX' as RecipeUnit,
        name: firstRecipe.name,
        cost: 0,
      },
    ]);
  }, [allRecipes]);

  const handleRemoveRecipe = useCallback((index: number) => {
    setRecipes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRecipeChange = useCallback(
    (index: number, field: string, value: string | number) => {
      setRecipes((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;

          if (field === 'recipeId') {
            const catalogRecipe = allRecipes.find((r) => r.id === value);
            return {
              ...item,
              recipeId: value as string,
              name: catalogRecipe?.name ?? item.name,
            };
          }

          return { ...item, [field]: value };
        }),
      );
    },
    [allRecipes],
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await api.deleteDish(id);
    navigate('/dishes');
  }, [id, navigate]);

  const loading = dishLoading || ingredientsLoading || recipesLoading;
  if (loading) return <div className={styles.loading}>Cargando...</div>;
  if (dishError) return <div className={styles.error}>{dishError}</div>;
  if (!dish) return <div className={styles.error}>Plato no encontrado</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <Link to="/dishes" className={styles.backLink}>
          ← Platos
        </Link>
        <SaveIndicator state={saveState} />
      </div>

      {/* Dish metadata */}
      <div className={styles.formRow}>
        <input
          className={styles.inputName}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del plato"
        />
        <NumberInput
          className={styles.inputNumber}
          value={pax}
          onChange={(value) => setPax(Math.max(1, Math.round(value)))}
          min={1}
          step="1"
          placeholder="PAX"
        />
      </div>

      <div className={styles.formRow}>
        <input
          className={styles.inputDate}
          type="date"
          value={deliveryDate}
          onChange={(event) => setDeliveryDate(event.target.value)}
        />
        <select
          className={styles.select}
          value={multiplier}
          onChange={(event) => setMultiplier(Number(event.target.value) as Multiplier)}
        >
          {MultiplierValues.map((m) => (
            <option key={m} value={m}>
              x{m}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formRow}>
        <textarea
          className={styles.inputNotes}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notas..."
        />
      </div>

      {/* Ingredients section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ingredientes</h2>
          <button className={styles.addButton} onClick={handleAddIngredient} title="Añadir ingrediente">
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
          <p className={styles.loading}>Sin ingredientes.</p>
        )}
      </div>

      {/* Recipes section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recetas</h2>
          <button className={styles.addButton} onClick={handleAddRecipe} title="Añadir receta">
            +
          </button>
        </div>

        {recipesWithCost.map((usage, index) => {
          const catalogRecipe = allRecipes.find((r) => r.id === usage.recipeId);
          const scale = catalogRecipe && catalogRecipe.yieldAmount > 0
            ? usage.amount / catalogRecipe.yieldAmount
            : 0;
          const scaledIngredients = catalogRecipe?.ingredients.map((ing) => ({
            ...ing,
            scaledAmount: ing.amount * scale,
          })) ?? [];
          const totalGrams = scaledIngredients.reduce((sum, ing) => {
            const factor = TO_GRAMS[ing.unit as Unit];
            return factor != null ? sum + ing.scaledAmount * factor : sum;
          }, 0);

          return (
            <div key={index}>
              <div className={styles.formRow}>
                <select
                  className={styles.select}
                  value={usage.recipeId}
                  onChange={(event) => handleRecipeChange(index, 'recipeId', event.target.value)}
                >
                  {allRecipes.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.name}
                    </option>
                  ))}
                </select>
                <NumberInput
                  className={styles.inputNumber}
                  value={usage.amount}
                  onChange={(value) => handleRecipeChange(index, 'amount', value)}
                  min={0}
                  step="any"
                  placeholder="Cantidad"
                />
                <UnitSelect
                  className={styles.select}
                  value={usage.unit}
                  onChange={(value) => handleRecipeChange(index, 'unit', value)}
                  kind="recipe"
                />
                <CostDisplay cents={usage.cost} />
                <button
                  className={styles.deleteInline}
                  onClick={() => handleRemoveRecipe(index)}
                  title="Eliminar"
                >
                  ✗
                </button>
              </div>
              {scaledIngredients.length > 0 && (
                <div className={styles.recipeIngredients}>
                  {scaledIngredients.map((ing, ingIdx) => {
                    const checkKey = `${usage.recipeId}-${ing.ingredientId}`;
                    return (
                      <label key={ingIdx} className={styles.recipeIngredientItem}>
                        <span className={styles.recipeIngredientAmount}>
                          {formatAmount(ing.scaledAmount)} {ing.unit}
                        </span>
                        <input
                          type="checkbox"
                          checked={checkedIngredients.has(checkKey)}
                          onChange={() => toggleCheck(checkKey)}
                        />
                        {ing.name}
                      </label>
                    );
                  })}
                  {totalGrams > 0 && (
                    <div className={styles.recipeTotal}>
                      Total {formatAmount(totalGrams)} g
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {recipesWithCost.length === 0 && (
          <p className={styles.loading}>Sin recetas.</p>
        )}
      </div>

      {/* Cost summary */}
      <div className={styles.costSummary}>
        <div className={styles.costRow}>
          <span>Ingredientes:</span>
          <CostDisplay cents={ingredientsCost} />
        </div>
        <div className={styles.costRow}>
          <span>Recetas:</span>
          <CostDisplay cents={recipesCost} />
        </div>
        <div className={styles.costRow}>
          <span>Coste base:</span>
          <CostDisplay cents={baseCost} missing={missingCost} />
        </div>
        <div className={`${styles.costRow} ${styles.costTotal}`}>
          <span>Precio final (x{multiplier}):</span>
          <CostDisplay cents={finalPrice} missing={missingCost} />
        </div>
      </div>

      {/* Danger zone */}
      <div className={styles.dangerZone}>
        <DeleteButton onDelete={handleDelete} label="Eliminar plato" />
      </div>
    </div>
  );
}
