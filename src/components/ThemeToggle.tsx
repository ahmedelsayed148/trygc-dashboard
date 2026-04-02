import React from 'react';
import { useTheme } from 'next-themes';
import { LaptopMinimal, Moon, Sun } from 'lucide-react';

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
  const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const title =
    nextTheme === 'system'
      ? 'Use system theme'
      : `Switch to ${nextTheme} mode`;

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="group relative rounded-xl p-2 transition-all hover:bg-[hsl(var(--muted)/0.9)]"
      title={title}
    >
      {theme === 'system' ? (
        <LaptopMinimal className="h-5 w-5 text-zinc-600 transition-all dark:text-zinc-400" />
      ) : currentTheme === 'dark' ? (
        <Sun className="h-5 w-5 text-zinc-600 transition-all dark:text-zinc-400" />
      ) : (
        <Moon className="h-5 w-5 text-zinc-600 transition-all dark:text-zinc-400" />
      )}
      <span className="pointer-events-none absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-sm"
        style={{ background: 'var(--app-primary)' }}
      >
        {theme === 'system' ? 'sys' : theme}
      </span>
    </button>
  );
}
