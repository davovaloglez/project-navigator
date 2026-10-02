import type { ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
  /** Posición respecto al trigger. Default: 'top'. */
  side?: 'top' | 'bottom';
}

/**
 * Tooltip ligero (CSS hover/focus, sin JS ni dependencias). Pensado para
 * botones de acción con icono. Envuelve el trigger en un `span.group`.
 */
export default function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const pos =
    side === 'top'
      ? 'bottom-full mb-1.5'
      : 'top-full mt-1.5';
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${pos} z-50 whitespace-nowrap rounded-md bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {label}
      </span>
    </span>
  );
}
