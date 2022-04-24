import { FC } from 'react';
import { CakeList } from './templates/CakeList';
import { IngredientList } from './templates/IngredientList';
import { RecipeList } from './templates/RecipeList';

interface PageDescription {
  path: string;
  title: string;
  Component: FC<{}>;
}

export const pages: PageDescription[] = [
  {
    path: '/ingredientes',
    title: 'Ingredientes',
    Component: IngredientList,
  },
  {
    path: '/recetas',
    title: 'Recetas',
    Component: RecipeList,
  },
  {
    path: '/pasteles',
    title: 'Pasteles',
    Component: CakeList,
  },
];

export const getPage = (component: FC<{}>) =>
  pages.find((x) => x.Component === component);
