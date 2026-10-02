import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Paginación unificada (NAV-82): selector de "Resultados por página" con
 * opción "Todos" + navegación prev/next. El `pageSize` elegido se persiste
 * por sección (via usePersistedFilters o localStorage en cs360); la página
 * actual NUNCA se persiste (convención existente — es estado exploratorio).
 */

export type PageSize = number | 'all';

export const DEFAULT_PAGE_SIZE: PageSize = 50;
export const PAGE_SIZE_OPTIONS: PageSize[] = [12, 24, 50, 100, 'all'];

/** Valida un pageSize que viene de storage (puede traer basura de versiones viejas). */
export function sanitizePageSize(value: unknown, fallback: PageSize = DEFAULT_PAGE_SIZE): PageSize {
  if (value === 'all') return 'all';
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: PageSize
): { paged: T[]; totalPages: number; safePage: number } {
  if (pageSize === 'all') return { paged: items, totalPages: 1, safePage: 0 };
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return {
    paged: items.slice(safePage * pageSize, (safePage + 1) * pageSize),
    totalPages,
    safePage,
  };
}

const VARIANTS = {
  dark: {
    wrap: 'text-slate-400',
    label: 'text-slate-500',
    select:
      'bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-slate-500',
    button:
      'p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed',
  },
  light: {
    wrap: 'text-slate-500',
    label: 'text-slate-500',
    select:
      'bg-white border border-slate-300 text-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400',
    button:
      'p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  },
} as const;

interface PaginationControlsProps {
  /** Total de resultados (post-filtros), no los de la página actual. */
  total: number;
  /** Página actual segura (0-based), salida de `paginate()`. */
  page: number;
  totalPages: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  options?: PageSize[];
  variant?: keyof typeof VARIANTS;
  className?: string;
}

export default function PaginationControls({
  total,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  options = PAGE_SIZE_OPTIONS,
  variant = 'dark',
  className = '',
}: PaginationControlsProps) {
  const v = VARIANTS[variant];
  const numericOptions = options.filter((o): o is number => o !== 'all');
  const minOption = numericOptions.length ? Math.min(...numericOptions) : 0;

  // Con pocos resultados no hay nada que controlar: cualquier opción los muestra todos.
  if (total <= minOption) return null;

  const rangeLabel =
    pageSize === 'all'
      ? `${total} resultado${total === 1 ? '' : 's'}`
      : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total}`;

  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap text-sm ${v.wrap} ${className}`}>
      <label className="flex items-center gap-2">
        <span className={v.label}>Resultados por página</span>
        <select
          value={String(pageSize)}
          onChange={(e) =>
            onPageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className={v.select}
        >
          {options.map((o) => (
            <option key={String(o)} value={String(o)}>
              {o === 'all' ? 'Todos' : o}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <span>{rangeLabel}</span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className={v.button}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className={v.button}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
