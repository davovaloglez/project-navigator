import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import {
  DIMENSIONS,
  DIMENSION_KEYS,
  calcCalificacion,
  calificacionColor,
  calificacionBg,
  comparePeriodos,
  quarterOf,
  recentPeriodos,
  type Dimension,
  type DimensionScores,
} from '../../../utils/evaluacion';
import Avatar from '../../ui/Avatar';
import ConfirmModal from '../../ui/ConfirmModal';

/**
 * Modal admin para crear / editar / borrar una evaluación de cualquier
 * persona. Se usa desde `/comparativa` (HU NAV-78). Persiste contra
 * `POST/DELETE /api/admin/evaluaciones` (`action:evaluacion:manage`).
 *
 * Reusable para create + edit: si `initialScores` viene, hidrata; si no,
 * arranca con 7s (neutro). La elección de período es libre dentro de los
 * últimos 8 trimestres + cualquier período donde la persona ya tenga eval.
 */

interface PersonContext {
  equipoId: string;
  name: string;
  image: string | null;
  /** Periodos donde esta persona YA tiene captura — para auto-hidratar. */
  knownPeriods: string[];
}

interface InitialState {
  periodo: string;
  scores: DimensionScores;
  notas: string;
}

interface Props {
  person: PersonContext;
  initial?: InitialState | null;
  onClose: () => void;
  onSaved: () => void;
}

function defaultScores(): DimensionScores {
  return DIMENSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: 7 }), {} as DimensionScores);
}

export default function EvaluacionEditModal({ person, initial, onClose, onSaved }: Props) {
  const [periodo, setPeriodo] = useState<string>(initial?.periodo ?? quarterOf());
  const [scores, setScores] = useState<DimensionScores>(initial?.scores ?? defaultScores());
  const [notas, setNotas] = useState<string>(initial?.notas ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Si cambian el periodo y la persona ya tenía captura ahí, podemos avisar.
  const isExistingPeriod = person.knownPeriods.includes(periodo);

  const periodOptions = useMemo(() => {
    const set = new Set<string>(recentPeriodos(8));
    for (const p of person.knownPeriods) set.add(p);
    if (initial?.periodo) set.add(initial.periodo);
    return [...set].sort((a, b) => comparePeriodos(b, a));
  }, [person.knownPeriods, initial?.periodo]);

  const calificacion = useMemo(() => calcCalificacion(scores), [scores]);
  const radarData = useMemo(
    () => DIMENSIONS.map((d) => ({ metric: d.label, value: scores[d.key] })),
    [scores],
  );

  // Lock scroll del body mientras el modal está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/evaluaciones', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: person.equipoId,
          periodo,
          notas: notas || null,
          ...scores,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/evaluaciones?equipoId=${encodeURIComponent(person.equipoId)}&periodo=${encodeURIComponent(periodo)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar');
    } finally {
      setSaving(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={saving ? undefined : onClose} />
        <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={person.name} image={person.image} size={42} />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white truncate">{person.name}</h3>
                <p className="text-xs text-slate-500">
                  {initial ? 'Editar evaluación' : 'Nueva evaluación'} · ediciones del admin
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-slate-400 hover:text-slate-200 text-sm px-2 disabled:opacity-50"
            >
              Cerrar
            </button>
          </div>

          {/* Período + calificación destacada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 mb-1 block">Período</label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {isExistingPeriod && !initial && (
                <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Esta persona ya tiene captura en {periodo} — la sobrescribirás.
                </p>
              )}
            </div>
            <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${calificacionBg(calificacion)}`}>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Calificación</p>
                <p className="text-[10px] text-slate-500">promedio derivado</p>
              </div>
              <p className={`text-3xl font-bold tabular-nums ${calificacionColor(calificacion)}`}>
                {calificacion.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Dos columnas: sliders + radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="space-y-3">
              {DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-baseline gap-2">
                      <label className="text-sm text-slate-200 font-medium">{d.label}</label>
                      <span className="text-[10px] text-slate-500">{d.hint}</span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${calificacionColor(scores[d.key])}`}>
                      {scores[d.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={scores[d.key]}
                    onChange={(e) =>
                      setScores((prev) => ({ ...prev, [d.key as Dimension]: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 flex flex-col min-h-72">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Vista previa</p>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar
                      name={person.name}
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-1 block">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Contexto observado, conversación de 1:1, etc."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Error + acciones */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 mb-3">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {initial ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:text-red-100 hover:bg-red-500/15 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Borrar
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {initial ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmModal
          title={`Borrar evaluación de ${person.name}`}
          message={`Vas a eliminar la captura del período ${periodo}. Esta acción no se puede deshacer.`}
          confirmLabel="Borrar"
          tone="danger"
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
