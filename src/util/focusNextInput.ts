export function focusNextInput({
  target,
}: React.ChangeEvent<HTMLInputElement>) {
  // lol
  const parent = target.closest('.chakra-form-control')?.parentElement;

  if (!parent) return;

  setTimeout(() => {
    const input = parent.querySelector<HTMLInputElement>(
      'input:not([readonly]):not([type=checkbox])'
    );

    if (input) {
      input.select();
    }
  }, 10);
}
