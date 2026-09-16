import * as React from 'react';

const KEY = 'tamix.theme';
type Theme = 'light' | 'dark';

function leerPreferido(): Theme {
  try {
    const guardado = localStorage.getItem(KEY);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    // localStorage puede fallar en modo privado; se usa el valor del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = React.useState<Theme>(() => (typeof window === 'undefined' ? 'light' : leerPreferido()));

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Ignorado: sólo afecta si el navegador recuerda la preferencia.
    }
  }, [theme]);

  const toggle = React.useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return [theme, toggle];
}
