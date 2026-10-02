/**
 * Mapeos de iconos + colores para Salud (calcHealthScore) y Estatus
 * (estatusColors). Usados en el Timeline (NAV-72, orden estandarizado en
 * NAV-84: Estatus > % > Salud) para el chip de estatus + icono de salud,
 * y para construir la mini-leyenda.
 */
import {
  Star,
  TrendingUp,
  Minus,
  TrendingDown,
  AlertTriangle,
  Check,
  Play,
  Clock,
  Pause,
  Ban,
  Activity,
  Rocket,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/** Buckets de salud según `calcHealthScore.label`. Orden de mejor a peor. */
export const HEALTH_BUCKETS: {
  label: string;
  range: string;
  icon: LucideIcon;
  textColor: string;
}[] = [
  { label: 'Excelente', range: '≥ 85', icon: Star, textColor: 'text-green-400' },
  { label: 'Bueno', range: '65-84', icon: TrendingUp, textColor: 'text-blue-400' },
  { label: 'Medio', range: '45-64', icon: Minus, textColor: 'text-yellow-400' },
  { label: 'Bajo', range: '25-44', icon: TrendingDown, textColor: 'text-orange-400' },
  { label: 'Crítico', range: '< 25', icon: AlertTriangle, textColor: 'text-red-400' },
];

const HEALTH_INDEX = new Map(HEALTH_BUCKETS.map((b) => [b.label, b] as const));

/** Estatus declarado (columna `estatus` del proyecto). Orden didáctico. */
export const ESTATUS_VISUALS: {
  label: string;
  icon: LucideIcon;
}[] = [
  { label: 'Done', icon: Check },
  { label: 'On Track', icon: Play },
  { label: 'Upcoming', icon: Clock },
  { label: 'On Hold', icon: Pause },
  { label: 'At Risk', icon: AlertTriangle },
  { label: 'Blocked / Critical', icon: Ban },
  { label: 'Hypercare', icon: Activity },
  { label: 'LaunchPhase', icon: Rocket },
  { label: 'Cancelado', icon: XCircle },
];

const ESTATUS_INDEX = new Map(ESTATUS_VISUALS.map((v) => [v.label, v] as const));

export function healthIconFor(label: string): LucideIcon {
  return HEALTH_INDEX.get(label)?.icon ?? Minus;
}

export function healthTextColor(label: string): string {
  return HEALTH_INDEX.get(label)?.textColor ?? 'text-slate-400';
}

export function estatusIconFor(estatus: string): LucideIcon {
  return ESTATUS_INDEX.get(estatus)?.icon ?? Minus;
}
