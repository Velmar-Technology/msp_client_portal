import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../theme-provider';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg flex items-center justify-center cursor-pointer"
        aria-label={t('theme.toggleTheme')}
      >
        <div className="relative h-5 w-5 flex items-center justify-center">
          {/* Light Theme Active */}
          {theme === 'light' && (
            <Sun className="h-5 w-5 animate-fade-in" />
          )}
          {/* Dark Theme Active */}
          {theme === 'dark' && (
            <Moon className="h-5 w-5 animate-fade-in" />
          )}
          {/* System Theme Active - Show combination based on system color */}
          {theme === 'system' && (
            <>
              <Sun className="h-5 w-5 dark:hidden animate-fade-in" />
              <Moon className="h-5 w-5 hidden dark:block animate-fade-in" />
            </>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1 z-50 animate-fade-in">
          <button
            onClick={() => {
              setTheme('light');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-body-md transition-colors hover:bg-surface-container-low cursor-pointer ${
              theme === 'light' ? 'text-primary font-semibold' : 'text-on-surface-variant'
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>{t('theme.light')}</span>
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-body-md transition-colors hover:bg-surface-container-low cursor-pointer ${
              theme === 'dark' ? 'text-primary font-semibold' : 'text-on-surface-variant'
            }`}
          >
            <Moon className="h-4 w-4" />
            <span>{t('theme.dark')}</span>
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-body-md transition-colors hover:bg-surface-container-low cursor-pointer ${
              theme === 'system' ? 'text-primary font-semibold' : 'text-on-surface-variant'
            }`}
          >
            <Laptop className="h-4 w-4 text-on-surface-variant opacity-70" />
            <span>{t('theme.system')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
