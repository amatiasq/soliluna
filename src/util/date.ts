export function date(val = new Date()) {
  const year = val.getFullYear();
  const month = (val.getMonth() + 1).toString().padStart(2, '0');
  const day = val.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function printDate(val = new Date()) {
  return Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(val);
}
