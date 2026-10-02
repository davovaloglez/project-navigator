import { RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../utils/theme';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Header({ title, onRefresh, loading }: HeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex items-center justify-between gap-3 mb-6 print:mb-2">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-2 print:hidden shrink-0">
        <button
          onClick={toggle}
          className="flex items-center justify-center w-9 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        )}
      </div>
    </header>
  );
}
