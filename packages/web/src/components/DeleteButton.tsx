import { useState } from 'react';

interface DeleteButtonProps {
  onDelete: () => Promise<void>;
  label?: string;
}

/**
 * A button that shows a browser confirm dialog before executing the delete action.
 * Disables itself while the deletion is in progress to prevent double-clicks.
 */
export function DeleteButton({ onDelete, label = 'Eliminar' }: DeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm('¿Seguro que quieres eliminar?');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete();
    } catch {
      alert('Error al eliminar. Puede que esté en uso.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={deleting}
      title={label}
      style={{ color: 'var(--color-error)', cursor: deleting ? 'wait' : 'pointer' }}
    >
      {deleting ? '...' : '\u2717'}
    </button>
  );
}
