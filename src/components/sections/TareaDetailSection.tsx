import { useMemo } from 'react';
import { Calendar, Star, Gauge, Target, ExternalLink, User, Briefcase, Flag, Layers } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { TareaRecord, ProjectRecord } from '../../utils/dataTransforms';
import { getTipoTareaColor, getSaludColor, getPrioridadColor } from '../../utils/colors';
import Breadcrumbs from '../ui/Breadcrumbs';
import PageLink from '../auth/PageLink';
import GlossaryTooltip from '../ui/GlossaryTooltip';

interface Props {
  id: string;
}

/** Badge de estatus por substring (los estatus de actividades difieren de los de proyectos). */
function statusBadge(estatus: string): string {
  const s = estatus.toLowerCase();
  if (s.includes('done') || s.includes('completad')) return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s.includes('in progress') || s.includes('en proceso')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (s.includes('review')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (s.includes('testing') || s.includes('qa')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (s.includes('change')) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  if (s.includes('cancelad')) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}

export default function TareaDetailSection({ id }: Props) {
  const { data, loading, error, refetch } = useSheetData<TareaRecord>('/api/tareas');
  const proyectos = useSheetData<ProjectRecord>('/api/proyectos');

  const tarea = useMemo(() => data.find((t) => t.id === id) || null, [data, id]);
  const parent = useMemo(
    () => (tarea?.proyectoId ? proyectos.data.find((p) => p.id === tarea.proyectoId) || null : null),
    [proyectos.data, tarea],
  );

  if (loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Cronograma', href: '/cronograma' }, { label: 'Tarea' }]} />
        <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-40 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-64" />
          <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Cronograma', href: '/cronograma' }, { label: 'Tarea' }]} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar la tarea</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">Reintentar</button>
        </div>
      </div>
    );
  }

  if (!tarea) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Cronograma', href: '/cronograma' }, { label: 'Tarea' }]} />
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-300 font-medium mb-1">Tarea no encontrada</p>
          <p className="text-sm text-slate-500">El identificador no corresponde a ninguna actividad visible.</p>
          <a href="/cronograma" className="inline-block mt-4 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600">Volver al cronograma</a>
        </div>
      </div>
    );
  }

  const t = tarea;
  const ratio = t.puntos > 0 && t.tracked > 0 ? t.tracked / t.puntos : null;
  const ratioColor = ratio === null ? 'text-slate-400' : ratio > 1.2 ? 'text-red-400' : ratio < 0.8 ? 'text-blue-400' : 'text-green-400';
  const avancePct = Math.round((t.avance || 0) * 100);
  const tipoC = getTipoTareaColor(t.tipo);
  const saludC = getSaludColor(t.salud);
  const prioC = getPrioridadColor(t.prioridad);
  const fin = t.finReal || t.finEstimado;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Cronograma', href: '/cronograma' }, { label: t.folio || t.nombre }]} />

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            {t.epica && <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t.epica}</p>}
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t.nombre}</h1>
            {t.folio && <p className="text-xs text-slate-500 font-mono mt-1">{t.folio}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${statusBadge(t.estatus)}`}>{t.estatus}</span>
            {t.salud && <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${saludC.bg} ${saludC.text}`}>{t.salud}</span>}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          {t.fase && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/60 text-slate-300">{t.fase}</span>}
          {t.sprint && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-300">{t.sprint}</span>}
          {t.tipo && <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${tipoC.bg} ${tipoC.text}`}>{t.tipo}</span>}
          {t.prioridad && <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${prioC.bg} ${prioC.text}`}>{t.prioridad}</span>}
          {t.url && (
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-colors">
              <ExternalLink className="w-3 h-3" /> Abrir en origen
            </a>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-300 mb-1"><Star className="w-4 h-4" /><span className="text-[11px] text-slate-500 uppercase tracking-wider">Puntos (est.)</span></div>
          <p className="text-2xl font-bold text-white">{t.puntos || 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-300 mb-1"><Gauge className="w-4 h-4" /><span className="text-[11px] text-slate-500 uppercase tracking-wider">Real (tracked)</span></div>
          <p className="text-2xl font-bold text-white">{t.tracked || 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-300 mb-1"><Target className="w-4 h-4" /><span className="text-[11px] text-slate-500 uppercase tracking-wider">Avance</span></div>
          <p className="text-2xl font-bold text-white">{avancePct}%</p>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full ${avancePct >= 80 ? 'bg-green-500' : avancePct >= 40 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${avancePct}%` }} />
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-300 mb-1"><Gauge className="w-4 h-4" /><span className="text-[11px] text-slate-500 uppercase tracking-wider">Ratio real/est.</span></div>
          <p className={`text-2xl font-bold ${ratioColor}`}>{ratio === null ? '—' : `${ratio.toFixed(2)}×`}</p>
          <p className="text-[10px] text-slate-500 mt-1">{ratio === null ? 'sin datos' : ratio > 1.2 ? 'tardó más' : ratio < 0.8 ? 'tardó menos' : 'en estimación'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Detalles */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Detalles <GlossaryTooltip id="tarea-detalle-detalles" /></h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Proyecto">
              {parent ? (
                <PageLink pageKey="portafolio" href={`/proyecto/${parent.id}`} className="text-blue-300 hover:text-blue-200" deniedClassName="text-slate-200">
                  {parent.actividad}
                </PageLink>
              ) : (
                <span className="text-slate-400">{t.proyecto || 'Sin proyecto'}</span>
              )}
            </Field>
            <Field label="Asignado">
              {t.asignado ? (
                <PageLink pageKey="equipo" href={`/persona/${t.asignadoId || encodeURIComponent(t.asignado)}`} className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200" deniedClassName="text-slate-200">
                  <User className="w-3.5 h-3.5" /> {t.asignado}
                </PageLink>
              ) : '—'}
            </Field>
            <Field label="Rol">{t.rol || '—'}</Field>
            <Field label="Fase"><span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-slate-500" />{t.fase || '—'}</span></Field>
            <Field label="Épica">{t.epica || '—'}</Field>
            <Field label="OU / Producto">{t.producto || '—'}</Field>
            <Field label="Dificultad">{t.dificultad || '—'}</Field>
            <Field label="Prioridad"><span className="inline-flex items-center gap-1"><Flag className="w-3.5 h-3.5 text-slate-500" />{t.prioridad || '—'}</span></Field>
          </div>
        </div>

        {/* Fechas */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Fechas <GlossaryTooltip id="tarea-detalle-fechas" /></h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Registro">{t.registro || '—'}</Field>
            <Field label="Inicio">{t.inicio || '—'}</Field>
            <Field label="Fin estimado">{t.finEstimado || '—'}</Field>
            <Field label="Fin real">{t.finReal || '—'}</Field>
          </div>
          {t.inicio && fin && (
            <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-700/50">
              {t.inicio} → {fin}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
