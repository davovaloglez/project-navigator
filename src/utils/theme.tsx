import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

function getStoredTheme(fallback: Theme = 'dark'): Theme {
  if (typeof window === 'undefined') return fallback;
  return (localStorage.getItem('project-navigator-theme') as Theme) || fallback;
}

/** Aplicación por defecto (app principal): clase `light`/`dark` en <html>. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

/**
 * Aplicación para CS360: NUNCA usa la clase `light` (CS360 importa `global.css`,
 * cuyos overrides `html.light` están pensados para la app dark-first y romperían
 * la paleta clara cruda de CS360). En claro = sin clase (look del mock); en
 * oscuro = clase `dark` (estilado en `cs360-dark.css`, scoped a la página).
 */
export function applyCs360Theme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light');
  root.classList.toggle('dark', theme === 'dark');
}

/**
 * Hook de tema compartido por toda P-Nav (llave `project-navigator-theme` +
 * evento `pn-theme-change`). `defaultTheme` fija el fallback cuando el usuario
 * no ha elegido (app principal: `dark`; CS360: `light`). `apply` permite a CS360
 * sustituir la regla de aplicación de clase sin bifurcar el estado/persistencia.
 */
export function useTheme(
  defaultTheme: Theme = 'dark',
  apply: (theme: Theme) => void = applyTheme
) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(defaultTheme));

  useEffect(() => {
    apply(theme);

    const handler = (e: Event) => {
      const newTheme = (e as CustomEvent).detail as Theme;
      setTheme(newTheme);
      apply(newTheme);
    };
    window.addEventListener('pn-theme-change', handler);
    return () => window.removeEventListener('pn-theme-change', handler);
    // `apply` es estable (referencia de módulo); el efecto corre una vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    apply(newTheme);
    localStorage.setItem('project-navigator-theme', newTheme);
    window.dispatchEvent(new CustomEvent('pn-theme-change', { detail: newTheme }));
  }, [theme, apply]);

  return { theme, toggle };
}
