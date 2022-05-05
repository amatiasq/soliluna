import { ColorModeScript } from '@chakra-ui/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { pages } from './router';
import { App } from './templates/App';
import { CakeView } from './templates/CakeView';
import { Home } from './templates/Home';
import { RecipeView } from './templates/RecipeView';

const container = document.getElementById('app-root');
const root = createRoot(container!);

root.render(
  <>
    <ColorModeScript initialColorMode="dark" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          {pages.map((x) => (
            <Route key={x.path} path={x.path} element={<x.Component />} />
          ))}
          <Route path="/recetas/:id" element={<RecipeView />} />
          <Route path="/pasteles/:id" element={<CakeView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </>
);
