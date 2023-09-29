import { ColorModeScript } from '@chakra-ui/react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { pages } from './router';
import { App } from './templates/App';
import { CakeView } from './templates/CakeView';
import { ExportData } from './templates/ExportData';
import { Home } from './templates/Home';
import { Login } from './templates/Login';
import { RecipeView } from './templates/RecipeView';
import { withAuth } from './util/withAuth';

const container = document.getElementById('app-root');
const root = createRoot(container!);

root.render(
  <>
    <div id="firebaseui-auth-container"></div>
    <ColorModeScript initialColorMode="dark" />
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={withAuth(<Home />)} />
          <Route path="/login" element={<Login />} />

          {pages.map((x) => (
            <Route
              key={x.path}
              path={x.path}
              element={withAuth(<x.Component />)}
            />
          ))}

          <Route path="/recetas/:id" element={withAuth(<RecipeView />)} />
          <Route path="/pasteles/:id" element={withAuth(<CakeView />)} />
          <Route path="/export" element={withAuth(<ExportData />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  </>
);
