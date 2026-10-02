import { useState } from 'react';
import { Database, Trash2, Camera } from 'lucide-react';
import { clearSnapshots, captureSnapshot } from '../../utils/snapshots';
import type { ProjectRecord, CursoRecord } from '../../utils/dataTransforms';

interface Props {
  weeks: number;
  firstWeek: string | null;
  lastWeek: string | null;
  projectsTracked: number;
  cursosTracked: number;
  projects: ProjectRecord[];
  cursos: CursoRecord[];
  onChange: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function SnapshotStatusCard({
  weeks,
  firstWeek,
  lastWeek,
  projectsTracked,
  cursosTracked,
  projects,
  cursos,
  onChange,
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleCapture = () => {
    setBusy(true);
    captureSnapshot(projects, cursos, { force: true });
    setBusy(false);
    onChange();
  };

  const handleClear = () => {
    if (!confirm('¿Borrar todos los snapshots guardados en este navegador? Esta acción no se puede deshacer.')) return;
    clearSnapshots();
    onChange();
  };

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-slate-300">Snapshots semanales</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCapture}
            disabled={busy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700 text-slate-300 text-[11px] hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <Camera className="w-3 h-3" /> Capturar ahora
          </button>
          {weeks > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/15 text-red-300 text-[11px] hover:bg-red-500/25 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Borrar
            </button>
          )}
        </div>
      </div>

      {weeks === 0 ? (
        <p className="text-sm text-slate-400">
          Aún no hay snapshots. Se capturan automáticamente al abrir Pronósticos, con una frecuencia mínima de 7 días.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-white">{weeks}</p>
            <p className="text-[11px] text-slate-500 mt-1">semanas guardadas</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{formatDate(firstWeek)}</p>
            <p className="text-[11px] text-slate-500 mt-1">primer snapshot</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{formatDate(lastWeek)}</p>
            <p className="text-[11px] text-slate-500 mt-1">último snapshot</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {projectsTracked} / {cursosTracked}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">proyectos / cursos tracked</p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-700/50 leading-relaxed">
        Los snapshots se guardan en <code className="text-slate-300 text-[10px]">localStorage</code> de este navegador (no en servidor). Sirven para (1) backtesting del motor de pronóstico y (2) derivar la velocidad de avance en cursos.
      </p>
    </div>
  );
}
