import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Ingredient, Unit } from '@soliluna/shared';
import * as api from '../services/api';
import { saveWithOfflineFallback } from '../services/cache';
import { useAutoSave } from '../hooks/useAutoSave';
import { SaveIndicator } from '../components/SaveIndicator';
import { DeleteButton } from '../components/DeleteButton';
import { UnitSelect } from '../components/UnitSelect';
import { NumberInput } from '../components/NumberInput';
import styles from './Pages.module.css';

interface IngredientRowProps {
  ingredient: Ingredient;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (updated: Ingredient) => void;
}

/**
 * A single ingredient rendered as an inline editable form row.
 * Auto-saves whenever any field changes.
 * Supports offline saving: writes to IndexedDB and queues API call.
 *
 * Price is stored as cents but displayed/edited as euros.
 */
export function IngredientRow({ ingredient, onDelete, onUpdate }: IngredientRowProps) {
  const [name, setName] = useState(ingredient.name);
  const [pkgSize, setPkgSize] = useState(ingredient.pkgSize);
  const [pkgUnit, setPkgUnit] = useState<Unit>(ingredient.pkgUnit);
  const [pkgPriceEuros, setPkgPriceEuros] = useState(ingredient.pkgPrice / 100);

  // Track the latest server updatedAt for conflict detection.
  // The prop may not change after saves (parent's onUpdate is lightweight),
  // so we maintain our own ref that gets updated after each successful save.
  const latestUpdatedAt = useRef(ingredient.updatedAt);
  useEffect(() => {
    latestUpdatedAt.current = ingredient.updatedAt;
  }, [ingredient.updatedAt]);

  const formValues = useMemo(
    () => ({ name, pkgSize, pkgUnit, pkgPriceEuros }),
    [name, pkgSize, pkgUnit, pkgPriceEuros],
  );

  const handleSave = useCallback(
    async (values: typeof formValues): Promise<void | 'offline'> => {
      if (!values.name.trim()) return;

      const pkgPriceCents = Math.round(values.pkgPriceEuros * 100);
      const updatedAt = new Date().toISOString();

      const updateBody = {
        name: values.name,
        pkgSize: values.pkgSize,
        pkgUnit: values.pkgUnit,
        pkgPrice: pkgPriceCents,
        updatedAt: latestUpdatedAt.current,
      };

      // Build an optimistic Ingredient for local cache
      const optimisticIngredient: Ingredient = {
        ...ingredient,
        name: values.name,
        pkgSize: values.pkgSize,
        pkgUnit: values.pkgUnit,
        pkgPrice: pkgPriceCents,
        updatedAt,
      };

      const result = await saveWithOfflineFallback(
        'ingredients',
        optimisticIngredient,
        'PUT',
        `/api/ingredients/${ingredient.id}`,
        updateBody,
        async () => {
          const updated = await api.updateIngredient(ingredient.id, updateBody);
          latestUpdatedAt.current = updated.updatedAt;
          onUpdate(updated);
        },
      );

      if (result === 'offline') return 'offline';
    },
    [ingredient.id, onUpdate],
  );

  const saveState = useAutoSave(formValues, handleSave);

  return (
    <div className={styles.formRow}>
      <input
        className={styles.inputName}
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre"
      />
      <NumberInput
        className={styles.inputNumber}
        value={pkgSize}
        onChange={setPkgSize}
        min={0}
        step="any"
        placeholder="Cantidad"
      />
      <UnitSelect
        className={styles.select}
        value={pkgUnit}
        onChange={(value) => setPkgUnit(value as Unit)}
        kind="ingredient"
      />
      <NumberInput
        className={styles.inputNumber}
        value={pkgPriceEuros}
        onChange={setPkgPriceEuros}
        min={0}
        step="0.01"
        placeholder="Precio €"
      />
      <SaveIndicator state={saveState} />
      <DeleteButton onDelete={() => onDelete(ingredient.id)} />
    </div>
  );
}
