import { Unit, RecipeUnit } from '@soliluna/shared';

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  kind: 'ingredient' | 'recipe';
  className?: string;
}

/**
 * A select dropdown for unit selection.
 * Renders either ingredient units (l, ml, kg, g, u) or recipe units (PAX, kg, g)
 * depending on the `kind` prop.
 */
export function UnitSelect({ value, onChange, kind, className }: UnitSelectProps) {
  const options = kind === 'ingredient' ? Unit : RecipeUnit;

  return (
    <select
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}
