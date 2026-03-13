import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
        <div className="w-5 h-5"></div>
      </button>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all relative group"
      title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {currentTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-zinc-600 dark:text-zinc-400 transition-all" />
      ) : (
        <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-400 transition-all" />
      )}
    </button>
  );
}