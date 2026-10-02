import { Settings, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { DashboardConfig } from '../../hooks/useDashboardConfig';

interface Props {
  config: DashboardConfig;
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReset: () => void;
}

export default function DashboardCustomizer({ config, onToggle, onMove, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          open ? 'bg-blue-500/15 text-blue-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
        title="Personalizar dashboard"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Personalizar</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Widgets del Dashboard</h3>
            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
          <div className="py-1 max-h-80 overflow-y-auto">
            {config.widgets.map((widget, idx) => (
              <div
                key={widget.id}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-700/50"
              >
                <button
                  onClick={() => onToggle(widget.id)}
                  className={`shrink-0 ${widget.visible ? 'text-blue-400' : 'text-slate-500'}`}
                >
                  {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <span
                  className={`flex-1 text-sm ${widget.visible ? 'text-slate-200' : 'text-slate-500'}`}
                >
                  {widget.label}
                </span>
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => onMove(widget.id, 'up')}
                    disabled={idx === 0}
                    className="text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onMove(widget.id, 'down')}
                    disabled={idx === config.widgets.length - 1}
                    className="text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-700">
            <p className="text-[11px] text-slate-500">Tus preferencias se guardan en tu navegador.</p>
          </div>
        </div>
      )}
    </div>
  );
}
