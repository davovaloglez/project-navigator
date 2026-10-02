import { X, Search, RotateCcw } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  multi?: boolean;
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  onClear: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClear,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
}: FilterBarProps) {
  const hasActiveFilters = Object.values(activeFilters).some((v) => v.length > 0) || (searchValue && searchValue.length > 0);

  function toggleFilter(key: string, value: string, multi: boolean) {
    const current = activeFilters[key] || [];
    if (multi) {
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      onFilterChange(key, next);
    } else {
      onFilterChange(key, current.includes(value) ? [] : [value]);
    }
  }

  return (
    <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div className="flex items-center gap-3 flex-wrap">
        {onSearchChange && (
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
        {hasActiveFilters && (
          <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>
      {filters.map((filter) => (
        <div key={filter.key}>
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">{filter.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {filter.options.map((opt) => {
              const isActive = (activeFilters[filter.key] || []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleFilter(filter.key, opt.value, filter.multi ?? true)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                  {isActive && <X className="w-3 h-3 ml-1 inline" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
