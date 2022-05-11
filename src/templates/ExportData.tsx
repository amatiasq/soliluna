import React from 'react';
import { Loading } from '../components/Loading';
import { useFireList } from '../hooks/useFireList';
import { Cake } from '../model/Cake';
import { Ingredient } from '../model/Ingredient';
import { Recipe } from '../model/Recipe';

export function ExportData() {
  const cakes = useFireList<Cake>('pasteles');
  const recipes = useFireList<Recipe>('recetas');
  const ingredients = useFireList<Ingredient>('ingredientes');

  if (cakes.isLoading || recipes.isLoading || ingredients.isLoading) {
    return <Loading />;
  }

  const data = {
    cakes: cakes.data,
    recipes: recipes.data,
    ingredients: ingredients.data,
  };

  console.log(data);
  console.log('copy(exportDb())');

  function exportDb() {
    return `importDb(${JSON.stringify(data, null, 2)})`;
  }

  Object.assign(window, {
    db: data,
    exportDb,
    importDb: importDb(cakes.add, recipes.add, ingredients.add),
  });

  return <>Done</>;
}

function importDb(
  addCake: (x: Cake) => Promise<any>,
  addRecipe: (x: Recipe) => Promise<any>,
  addIngredient: (x: Ingredient) => Promise<any>
) {
  return async ({ cakes = [], recipes = [], ingredients = [] }) => {
    for (const x of ingredients) {
      await addIngredient(x);
    }
    for (const x of recipes) {
      await addRecipe(x);
    }
    for (const x of cakes) {
      await addCake(x);
    }
  };
}
