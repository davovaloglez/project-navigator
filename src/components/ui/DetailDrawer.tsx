import type { ReactNode } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface DetailDrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  badges?: ReactNode;
  children: ReactNode;
}

export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-slate-700/50">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm text-slate-200">
        {isUrl(value) ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            Ver enlace <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <span className="whitespace-pre-wrap">{value}</span>
        )}
      </dd>
    </div>
  );
}

export default function DetailDrawer({ title, open, onClose, badges, children }: DetailDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white truncate mr-3">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-1">
          {badges && (
            <div className="flex flex-wrap gap-2 mb-4">
              {badges}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
