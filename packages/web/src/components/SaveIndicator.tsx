import type { SaveState } from '../hooks/useAutoSave';

const INDICATOR_MAP: Record<SaveState, { symbol: string; cssVar: string; title: string }> = {
  idle: { symbol: '\u2713', cssVar: 'var(--color-success)', title: 'Guardado' },
  pending: { symbol: '...', cssVar: 'var(--color-info)', title: 'Pendiente' },
  saving: { symbol: '\u21bb', cssVar: 'var(--color-warning)', title: 'Guardando...' },
  offline: { symbol: '\u2601', cssVar: 'var(--color-offline)', title: 'Guardado localmente (sin conexion)' },
  error: { symbol: '\u2717', cssVar: 'var(--color-error)', title: 'Error al guardar' },
};

interface SaveIndicatorProps {
  state: SaveState;
}

export function SaveIndicator({ state }: SaveIndicatorProps) {
  const { symbol, cssVar, title } = INDICATOR_MAP[state];

  return (
    <span
      title={title}
      style={{
        color: cssVar,
        fontWeight: 'bold',
        fontSize: '1rem',
        minWidth: '1.5em',
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {symbol}
    </span>
  );
}
