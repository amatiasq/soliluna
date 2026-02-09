import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
import { IngredientList } from './pages/IngredientList';
import { RecipeList } from './pages/RecipeList';
import { RecipeDetail } from './pages/RecipeDetail';
import { DishList } from './pages/DishList';
import { DishDetail } from './pages/DishDetail';
import { useOnline } from './hooks/useOnline';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { setupSyncListeners, preloadAllData } from './services/sync';
import styles from './App.module.css';

function Layout() {
  const online = useOnline();

  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <NavLink
          to="/ingredients"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          Ingredientes
        </NavLink>
        <NavLink
          to="/recipes"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          Recetas
        </NavLink>
        <NavLink
          to="/dishes"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          Platos
        </NavLink>
        <span
          className={styles.onlineIndicator}
          title={online ? 'Conectado' : 'Sin conexión'}
          style={{ color: online ? 'var(--color-success)' : 'var(--color-error)' }}
        >
          {online ? '●' : '○'}
        </span>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  // Connect to SSE for real-time sync with other devices
  useRealtimeSync();

  useEffect(() => {
    // Pre-fill IndexedDB with the latest data on app start
    preloadAllData();

    // Set up online/offline and visibility listeners for background sync
    const cleanup = setupSyncListeners();
    return cleanup;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/ingredients" replace />} />
          <Route path="ingredients" element={<IngredientList />} />
          <Route path="recipes" element={<RecipeList />} />
          <Route path="recipes/:id" element={<RecipeDetail />} />
          <Route path="dishes" element={<DishList />} />
          <Route path="dishes/:id" element={<DishDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
