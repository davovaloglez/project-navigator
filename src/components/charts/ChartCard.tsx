import type { ReactNode } from 'react';
import InfoTooltip from '../ui/InfoTooltip';
import { canWith, readInlinePermissions } from '../../hooks/usePermissions';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  info?: { description: string; glossaryAnchor?: string };
}

export default function ChartCard({ title, children, className = '', info }: ChartCardProps) {
  // Gating a nivel bloque (ver KPICard). Default-ALLOW; oculta sólo si
  // hay deny explícito. El server sigue siendo el gate real.
  if (info?.glossaryAnchor && !canWith(readInlinePermissions(), `block:${info.glossaryAnchor}`)) {
    return null;
  }
  return (
    <div className={`bg-slate-800 border border-slate-700/50 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        {info && (
          <InfoTooltip
            label={title}
            description={info.description}
            glossaryAnchor={info.glossaryAnchor}
          />
        )}
      </div>
      {children}
    </div>
  );
}
