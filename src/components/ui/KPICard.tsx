import type { LucideIcon } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { canWith, readInlinePermissions } from '../../hooks/usePermissions';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  accentColor?: string;
  highlight?: boolean;
  info?: { description: string; glossaryAnchor?: string };
}

export default function KPICard({ title, value, subtitle, icon: Icon, accentColor = 'text-blue-400', highlight = false, info }: KPICardProps) {
  // Gating a nivel bloque: el id del bloque es `info.glossaryAnchor`
  // (= id del glosario). Default-ALLOW; sólo se oculta si hay un deny
  // explícito (rol u override). El server sigue siendo el gate real.
  if (info?.glossaryAnchor && !canWith(readInlinePermissions(), `block:${info.glossaryAnchor}`)) {
    return null;
  }
  return (
    <div className={`rounded-xl p-3 sm:p-5 transition-colors ${highlight ? 'bg-red-500/10 border border-red-500/30' : 'bg-slate-800 border border-slate-700/50'}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1 mr-1 min-w-0">
          <span className="text-xs sm:text-sm text-slate-400 truncate">{title}</span>
          {info && (
            <InfoTooltip
              label={title}
              description={info.description}
              glossaryAnchor={info.glossaryAnchor}
            />
          )}
        </div>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${accentColor} shrink-0`} />
      </div>
      <div className={`text-2xl sm:text-3xl font-bold mb-1 ${highlight ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs sm:text-sm text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
