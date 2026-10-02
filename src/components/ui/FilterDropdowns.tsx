import { useState, useRef, useEffect } from 'react';
import { Search, RotateCcw, ChevronDown, X } from 'lucide-react';

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

interface FilterDropdownsProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  onClear: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

function DropdownSelect({
  filter,
  selected,
  onChange,
}: {
  filter: FilterConfig;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(value: string) {
    if (filter.multi) {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      onChange(next);
    } else {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
    }
  }

  const displayLabel =
    selected.length === 0
      ? filter.label
      : selected.length === 1
        ? selected[0]
        : `${filter.label} (${selected.length})`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
          selected.length > 0
            ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
            : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
        }`}
      >
        <span className="truncate max-w-32">{displayLabel}</span>
        {selected.length > 0 ? (
          <X
            className="w-3.5 h-3.5 shrink-0 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-44 max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1">
          {filter.options.map((opt) => {
            const isActive = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {filter.multi && (
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                    }`}
                  >
                    {isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FilterDropdowns({
  filters,
  activeFilters,
  onFilterChange,
  onClear,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
}: FilterDropdownsProps) {
  const hasActiveFilters =
    Object.values(activeFilters).some((v) => v.length > 0) ||
    (searchValue && searchValue.length > 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {onSearchChange && (
        <div className="relative min-w-48 flex-1 max-w-sm">
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
      {filters.map((filter) => (
        <DropdownSelect
          key={filter.key}
          filter={filter}
          selected={activeFilters[filter.key] || []}
          onChange={(values) => onFilterChange(filter.key, values)}
        />
      ))}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-700 border border-slate-600 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );
}
