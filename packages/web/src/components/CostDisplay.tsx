import { formatCents } from '@soliluna/shared';

interface CostDisplayProps {
  cents: number | null;
  /** Ingredientes no calculables: con más de cero, el total va por debajo. */
  missing?: number;
}

/** `cents={null}` es «no calculable» y se pinta "—": un 0 se leería como gratis. */
export function CostDisplay({ cents, missing = 0 }: CostDisplayProps) {
  if (cents === null) {
    return (
      <span style={{ whiteSpace: 'nowrap' }} title="No calculable: unidades incompatibles">
        —
      </span>
    );
  }

  const formatted = formatCents(cents).replace('.', ',');

  if (missing > 0) {
    const label =
      missing === 1 ? '1 ingrediente sin calcular' : `${missing} ingredientes sin calcular`;

    return (
      <span style={{ whiteSpace: 'nowrap' }} title={`Estimación: ${label}`}>
        ≈&nbsp;{formatted}&nbsp;€ <span aria-label={label}>⚠</span>
      </span>
    );
  }

  return <span style={{ whiteSpace: 'nowrap' }}>{formatted}&nbsp;€</span>;
}
