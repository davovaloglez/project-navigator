import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, Trash2 } from 'lucide-react';
import type { Technology, TeamTechnology } from '@/utils/dataTransforms';
import { LEVEL_ORDER, LEVEL_LABEL, groupByCategory } from '@/utils/teamTechnology';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../equipo/tecnologiasShared';
import Avatar from '@components/ui/Avatar';
import ConfirmModal from '@components/ui/ConfirmModal';

/**
 * Modal admin para agregar / editar / quitar una tecnología del perfil de una
 * persona. Vive en el tab Tecnologías de `/persona/[id]` (Plan 016). Persiste
 * contra `POST/DELETE /api/admin/team-technologies` (`action:tecnologia:manage`).
 *
 * Reusable para create + edit:
 *   - create (`initial == null`): selector de tecnologías AÚN no asignadas.
 *   - edit (`initial != null`): tecnología fija (no editable), sólo nivel + quitar.
 *
 * Molde tomado de `comparativa/EvaluacionEditModal.tsx`.
 */

interface Props {
  equipoId: string;
  personName: string;
  personImage: string | null;
  catalog: Technology[];
  /** Todas las techs ya asignadas a esta persona (para excluirlas en create). */
  currentMatrix: TeamTechnology[];
  /** null = create; objeto = editar esa fila. */
  initial: TeamTechnology | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TecnologiaEditModal({
  equipoId,
  personName,
  personImage,
  catalog,
  currentMatrix,
  initial,
  onClose,
  onSaved,
}: Props) {
  const assignedIds = useMemo(
    () => new Set(currentMatrix.map((r) => r.technologyId)),
    [currentMatrix],
  );

  // Create: techs del catálogo aún no asignadas. Edit: sólo la tech actual.
  const availableTechs = useMemo(() => {
    if (initial) return catalog.filter((t) => t.id === initial.technologyId);
    return catalog.filter((t) => !assignedIds.has(t.id));
  }, [catalog, assignedIds, initial]);

  const grouped = useMemo(() => groupByCategory(availableTechs), [availableTechs]);

  const [technologyId, setTechnologyId] = useState<string>(initial?.technologyId ?? '');
  const [level, setLevel] = useState<TeamTechnology['level']>(initial?.level ?? 'mid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const currentTechName = useMemo(
    () => catalog.find((t) => t.id === (initial?.technologyId ?? technologyId))?.name ?? technologyId,
    [catalog, initial, technologyId],
  );

  // Lock scroll del body mientras el modal está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const save = async () => {
    if (!technologyId) {
      setError('Selecciona una tecnología.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/team-technologies', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, technologyId, level }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/team-technologies?equipoId=${encodeURIComponent(equipoId)}&technologyId=${encodeURIComponent(initial.technologyId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al quitar');
    } finally {
      setSaving(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={saving ? undefined : onClose} />
        <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={personName} image={personImage} size={42} />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white truncate">{personName}</h3>
                <p className="text-xs text-slate-500">
                  {initial ? 'Editar tecnología' : 'Agregar tecnología'} · ediciones del admin
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

          {/* Tecnología: selector (create) o display fijo (edit) */}
          <div className="mb-4">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 mb-1 block">
              Tecnología
            </label>
            {initial ? (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-200">{currentTechName}</span>
                <span className="text-[10px] text-slate-500">
                  ({catalog.find((t) => t.id === initial.technologyId)?.category ?? '—'})
                </span>
              </div>
            ) : availableTechs.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">
                Todas las tecnologías del catálogo ya están asignadas a esta persona.
              </p>
            ) : (
              <select
                value={technologyId}
                onChange={(e) => setTechnologyId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">— Selecciona —</option>
                {CATEGORY_ORDER.flatMap((cat) => {
                  const techs = grouped[cat] ?? [];
                  if (techs.length === 0) return [];
                  return [
                    <optgroup key={cat} label={CATEGORY_LABEL[cat] ?? cat}>
                      {techs.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>,
                  ];
                })}
              </select>
            )}
          </div>

          {/* Nivel */}
          <div className="mb-5">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 block">
              Nivel
            </label>
            <div className="flex flex-wrap gap-2">
              {LEVEL_ORDER.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    level === lvl
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {LEVEL_LABEL[lvl]}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 mb-3">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {initial ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:text-red-100 hover:bg-red-500/15 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Quitar
              </button>
            ) : (
              <span />
            )}
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
                disabled={saving || (!initial && !technologyId)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {initial ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmingDelete && initial && (
        <ConfirmModal
          title={`Quitar tecnología de ${personName}`}
          message={`Vas a quitar "${currentTechName}" del perfil de ${personName}. Esta acción no se puede deshacer.`}
          confirmLabel="Quitar"
          tone="danger"
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
