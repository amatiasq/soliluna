export const mutable = <T>(t: T): { -readonly [K in keyof T]: T[K] } => t;
