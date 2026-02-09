import type {
  Ingredient,
  IngredientCreate,
  IngredientUpdate,
  Recipe,
  RecipeCreate,
  RecipeUpdate,
  Dish,
  DishCreate,
  DishUpdate,
} from '@soliluna/shared';
import { CLIENT_ID } from './events';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Deduplicate in-flight GET requests: if a GET to the same path is
// already pending, reuse its promise instead of firing a second request.
const inflight = new Map<string, Promise<unknown>>();

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isGet = method === 'GET' && !body;

  if (isGet) {
    const pending = inflight.get(path);
    if (pending) return pending as Promise<T>;
  }

  const promise = doRequest<T>(method, path, body);

  if (isGet) {
    inflight.set(path, promise);
    promise.finally(() => inflight.delete(path));
  }

  return promise;
}

async function doRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-Client-Id': CLIENT_ID };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.error || 'Unknown error', err.data);
  }

  const json = await res.json();
  return json.data;
}

// -- Ingredients --

export function getIngredients(): Promise<Ingredient[]> {
  return request<Ingredient[]>('GET', '/ingredients');
}

export function createIngredient(data: IngredientCreate): Promise<Ingredient> {
  return request<Ingredient>('POST', '/ingredients', data);
}

export function updateIngredient(id: string, data: IngredientUpdate): Promise<Ingredient> {
  return request<Ingredient>('PUT', `/ingredients/${id}`, data);
}

export function deleteIngredient(id: string): Promise<void> {
  return request<void>('DELETE', `/ingredients/${id}`);
}

// -- Recipes --

export function getRecipes(): Promise<Recipe[]> {
  return request<Recipe[]>('GET', '/recipes');
}

export function getRecipe(id: string): Promise<Recipe> {
  return request<Recipe>('GET', `/recipes/${id}`);
}

export function createRecipe(data: RecipeCreate): Promise<Recipe> {
  return request<Recipe>('POST', '/recipes', data);
}

export function updateRecipe(id: string, data: RecipeUpdate): Promise<Recipe> {
  return request<Recipe>('PUT', `/recipes/${id}`, data);
}

export function deleteRecipe(id: string): Promise<void> {
  return request<void>('DELETE', `/recipes/${id}`);
}

// -- Dishes --

export function getDishes(): Promise<Dish[]> {
  return request<Dish[]>('GET', '/dishes');
}

export function getDish(id: string): Promise<Dish> {
  return request<Dish>('GET', `/dishes/${id}`);
}

export function createDish(data: DishCreate): Promise<Dish> {
  return request<Dish>('POST', '/dishes', data);
}

export function updateDish(id: string, data: DishUpdate): Promise<Dish> {
  return request<Dish>('PUT', `/dishes/${id}`, data);
}

export function deleteDish(id: string): Promise<void> {
  return request<void>('DELETE', `/dishes/${id}`);
}
