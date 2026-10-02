/**
 * Piezas presentacionales compartidas de la matriz de tecnologías.
 *
 * Extraídas de `equipo/Tecnologias.tsx` (Plan 016) para que el tab Tecnologías
 * de `/persona/[id]` reúse exactamente los mismos chips de nivel, etiquetas de
 * categoría y orden de categorías. Los helpers PUROS de datos (orden de niveles,
 * agrupación, joins inferidos) siguen en `@/utils/teamTechnology.ts`.
 */
import type { TeamTechnology } from '@/utils/dataTransforms';
import { LEVEL_LABEL } from '@/utils/teamTechnology';

// ---------------------------------------------------------------------------
// Level chip colours (Trainee → Arq: severity ascending = deeper saturation)
// ---------------------------------------------------------------------------
export const LEVEL_COLORS: Record<TeamTechnology['level'], string> = {
  trainee: 'bg-slate-600 text-slate-200',
  jr: 'bg-sky-800/80 text-sky-200',
  mid: 'bg-blue-700/80 text-blue-100',
  sr: 'bg-violet-700/80 text-violet-100',
  arq: 'bg-purple-600 text-purple-50 font-semibold',
};

export function LevelChip({ level }: { level: TeamTechnology['level'] }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${LEVEL_COLORS[level]}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Category display labels
// ---------------------------------------------------------------------------
export const CATEGORY_LABEL: Record<string, string> = {
  language: 'Lenguajes',
  framework: 'Frameworks / Web',
  mobile: 'Mobile',
  database: 'Bases de datos',
  cloud: 'Cloud',
  devops: 'DevOps',
  tool: 'Herramientas',
  design: 'Diseño',
};

// Fixed category order for the grid columns
export const CATEGORY_ORDER = ['language', 'framework', 'mobile', 'database', 'cloud', 'devops', 'tool', 'design'];
