export function capitalise(x: string) {
  const trimmed = x.trim();
  return `${trimmed[0].toUpperCase()}${trimmed.substring(1)}`;
}
