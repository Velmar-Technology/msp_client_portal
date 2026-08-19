import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from "@/components/theme-provider";
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
        className={`p-1.5 transition-colors rounded-sm cursor-pointer flex items-center justify-center ${
          open
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={t('theme.toggleTheme')}
      >
        <div className="relative h-4 w-4 flex items-center justify-center">
          {/* Light Theme Active */}
          {theme === 'light' && (
            <Sun className="h-4 w-4 animate-fade-in" />
          )}
          {/* Dark Theme Active */}
          {theme === 'dark' && (
            <Moon className="h-4 w-4 animate-fade-in" />
          )}
          {/* System Theme Active - Show combination based on system color */}
          {theme === 'system' && (
            <>
              <Sun className="h-4 w-4 dark:hidden animate-fade-in" />
              <Moon className="h-4 w-4 hidden dark:block animate-fade-in" />
            </>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-32 bg-card border border-border rounded-sm shadow-lg py-1 z-50 animate-fade-in overflow-hidden">
          <button
            onClick={() => {
              setTheme('light');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors cursor-pointer text-left ${
              theme === 'light' 
                ? 'text-foreground font-bold bg-muted' 
                : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>{t('theme.light')}</span>
          </button>
          
          <button
            onClick={() => {
              setTheme('dark');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors cursor-pointer text-left ${
              theme === 'dark' 
                ? 'text-foreground font-bold bg-muted' 
                : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>{t('theme.dark')}</span>
          </button>
          
          <button
            onClick={() => {
              setTheme('system');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors cursor-pointer text-left ${
              theme === 'system' 
                ? 'text-foreground font-bold bg-muted' 
                : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>{t('theme.system')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
