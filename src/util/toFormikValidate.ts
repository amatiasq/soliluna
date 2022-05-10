import { z } from 'zod';

function createValidationResult(error: z.ZodError) {
  const result: Record<string, string> = {};

  for (const x of error.errors) {
    result[x.path.filter(Boolean).join('.')] = x.message;
  }

  return result;
}

export function toFormikValidate<T>(
  schema: z.ZodSchema<T>,
  params?: Partial<z.ParseParams>
) {
  return async (values: T) => {
    const result = await schema.safeParseAsync(values, params);
    if (!result.success) {
      return createValidationResult(result.error);
    }
  };
}
