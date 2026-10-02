import InfoTooltip from './InfoTooltip';
import { getEntry } from '../../data/glossary';

interface GlossaryTooltipProps {
  id: string;
  label?: string;
}

/**
 * Wrapper sobre InfoTooltip que resuelve description y glossaryAnchor a partir
 * del id de una entrada del glosario. Úsalo para tooltips inline en bloques
 * custom que no usan KPICard / ChartCard.
 */
export default function GlossaryTooltip({ id, label }: GlossaryTooltipProps) {
  const entry = getEntry(id);
  if (!entry) return null;
  return (
    <InfoTooltip
      label={label ?? entry.title}
      description={entry.summary}
      glossaryAnchor={entry.id}
    />
  );
}
