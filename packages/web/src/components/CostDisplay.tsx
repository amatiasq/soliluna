import { formatCents } from '@soliluna/shared';

interface CostDisplayProps {
  cents: number;
}

/**
 * Displays a cost in euros, formatted from cents.
 * Example: <CostDisplay cents={284} /> renders "2,84 \u20ac"
 */
export function CostDisplay({ cents }: CostDisplayProps) {
  // formatCents returns "2.84" with a dot; we replace with comma for EU locale
  const formatted = formatCents(cents).replace('.', ',');

  return <span style={{ whiteSpace: 'nowrap' }}>{formatted}&nbsp;€</span>;
}
