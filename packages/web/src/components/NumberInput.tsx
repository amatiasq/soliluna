import { useState, useCallback } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: string;
  className?: string;
  placeholder?: string;
}

/**
 * A controlled number input that shows the raw string while the user is editing,
 * and converts to a proper number on blur. This avoids the jarring behavior of
 * reformatting numbers while the user is still typing.
 */
export function NumberInput({
  value,
  onChange,
  min,
  step,
  className,
  placeholder,
}: NumberInputProps) {
  const [editing, setEditing] = useState(false);
  const [rawValue, setRawValue] = useState('');

  const handleFocus = useCallback(() => {
    setEditing(true);
    setRawValue(String(value));
  }, [value]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    const parsed = parseFloat(rawValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  }, [rawValue, onChange]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRawValue(event.target.value);
  }, []);

  return (
    <input
      type="number"
      className={className}
      placeholder={placeholder}
      min={min}
      step={step}
      value={editing ? rawValue : value}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );
}
