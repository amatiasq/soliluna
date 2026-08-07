import { describe, expect, it } from 'vitest';
import { convert } from './conversion.ts';

describe('convert', () => {
  it('deja igual la misma unidad', () => {
    expect(convert(500, 'g', 'g')).toBe(500);
    expect(convert(3, 'u', 'u')).toBe(3);
  });

  it('convierte peso', () => {
    expect(convert(1, 'kg', 'g')).toBe(1000);
    expect(convert(500, 'g', 'kg')).toBe(0.5);
  });

  it('convierte volumen', () => {
    expect(convert(1, 'l', 'ml')).toBe(1000);
    expect(convert(250, 'ml', 'l')).toBe(0.25);
  });

  it('lanza entre familias, porque haría falta la densidad', () => {
    expect(() => convert(200, 'ml', 'g')).toThrow(/incompatible/);
    expect(() => convert(1, 'kg', 'l')).toThrow(/incompatible/);
    expect(() => convert(2, 'u', 'g')).toThrow(/incompatible/);
    expect(() => convert(100, 'g', 'u')).toThrow(/incompatible/);
  });
});
