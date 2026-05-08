export type Theme = 'light' | 'dark' | 'auto';

const THEME_KEY = 'app-theme';
const DARK_MODE_CLASS = 'dark-mode';

export function initTheme(): void {
  if (typeof window === 'undefined') return;

  const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
  const theme = savedTheme || 'auto';

  applyTheme(theme);
  window.addEventListener('storage', handleStorageChange);
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', handleSystemThemeChange);
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(THEME_KEY) as Theme) || 'auto';
}

export function getCurrentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  const theme = getTheme();

  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme(): void {
  const current = getCurrentTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add(DARK_MODE_CLASS);
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove(DARK_MODE_CLASS);
    document.documentElement.style.colorScheme = 'light';
  }
}

function handleStorageChange(event: StorageEvent): void {
  if (event.key === THEME_KEY && event.newValue) {
    applyTheme(event.newValue as Theme);
  }
}

function handleSystemThemeChange(): void {
  const theme = getTheme();
  if (theme === 'auto') {
    applyTheme('auto');
  }
}

export function useDarkMode() {
  if (typeof window === 'undefined') {
    return {
      isDark: false,
      theme: 'light' as const,
      setTheme,
      toggleTheme,
    };
  }

  const isDark = getCurrentTheme() === 'dark';
  const theme = getTheme();

  return {
    isDark,
    theme,
    setTheme,
    toggleTheme,
  };
}
