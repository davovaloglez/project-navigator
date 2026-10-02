import { useEffect, useRef, useState } from 'react';
import { Info, ArrowRight } from 'lucide-react';
import { InlineMarkdown } from './MarkdownText';

interface InfoTooltipProps {
  description: string;
  glossaryAnchor?: string;
  label?: string;
  iconClassName?: string;
}

export default function InfoTooltip({ description, glossaryAnchor, label, iconClassName = '' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipWidth = 288;
    const estTooltipHeight = 140;

    setPlacement(rect.bottom + estTooltipHeight + 16 > vh && rect.top > estTooltipHeight + 16 ? 'top' : 'bottom');

    const halfWidth = tooltipWidth / 2;
    if (rect.left + rect.width / 2 - halfWidth < 8) setAlign('left');
    else if (rect.left + rect.width / 2 + halfWidth > vw - 8) setAlign('right');
    else setAlign('center');

    function handleClick(e: MouseEvent) {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }

  function cancelClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  const placementClass = placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';
  const alignClass =
    align === 'center' ? 'left-1/2 -translate-x-1/2'
    : align === 'left' ? 'left-0'
    : 'right-0';

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        onFocus={() => { cancelClose(); setOpen(true); }}
        onBlur={scheduleClose}
        aria-label={label ? `Más información sobre ${label}` : 'Más información'}
        aria-expanded={open}
        className={`inline-flex items-center justify-center text-slate-500 hover:text-slate-200 focus:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded-full transition-colors ${iconClassName}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className={`absolute z-50 w-72 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-left ${placementClass} ${alignClass}`}
        >
          {label && <p className="text-[11px] font-semibold text-slate-200 mb-1">{label}</p>}
          <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">
            <InlineMarkdown text={description} />
          </p>
          {glossaryAnchor && (
            <a
              href={`/glosario#${glossaryAnchor}`}
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-2 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Más info <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </span>
  );
}
