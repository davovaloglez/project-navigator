import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitBranch,
  ExternalLink,
  Search,
  Filter,
  Plus,
  X,
  Shield,
  Eye,
  Code2,
  Rocket,
  FolderOpen,
  Users,
  AlertCircle,
  Loader2,
  ChevronDown,
  Edit2,
} from 'lucide-react';
import Header from '../layout/Header';
import type { RepoRecord } from '../../utils/dataTransforms';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type RolAcceso = 'administrador' | 'arquitecto' | 'colaborador' | 'visualizador' | 'deploy';

interface Colaborador {
  nombre: string;
  rol: RolAcceso;
}

interface RepoEnriquecido extends RepoRecord {
  colaboradores: Colaborador[];
}

interface Props {
  isSuperadmin?: boolean;
  activeEmpresa?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROL_META: Record<RolAcceso, { label: string; color: string; icon: React.ElementType }> = {
  administrador: { label: 'Admin',       color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: Shield },
  arquitecto:    { label: 'Arquitecto',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',     icon: Code2 },
  colaborador:   { label: 'Colaborador', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Users },
  visualizador:  { label: 'Visualizador',color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: Eye },
  deploy:        { label: 'Deploy',      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',  icon: Rocket },
};

const ROLES_ORDER: RolAcceso[] = ['administrador', 'arquitecto', 'colaborador', 'visualizador', 'deploy'];

/** Convierte los campos de roles planos del RepoRecord a un array de Colaborador. */
function enrichRepo(repo: RepoRecord): RepoEnriquecido {
  const colaboradores: Colaborador[] = [];
  for (const rol of ROLES_ORDER) {
    const raw: string = repo[rol] ?? '';
    if (!raw.trim()) continue;
    // Los nombres pueden venir separados por coma o salto de línea.
    raw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean).forEach((nombre) => {
      colaboradores.push({ nombre, rol });
    });
  }
  return { ...repo, colaboradores };
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function AvatarChip({ nombre, rol }: Colaborador) {
  const meta = ROL_META[rol];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-1.5 group" title={`${nombre} · ${meta.label}`}>
      <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
        {getInitials(nombre)}
      </div>
      <span className="text-xs text-slate-400 truncate max-w-[110px] group-hover:text-white transition-colors">
        {nombre}
      </span>
      <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${meta.color} shrink-0`}>
        <Icon className="w-2.5 h-2.5" />
        {meta.label}
      </span>
    </div>
  );
}

function EstatusChip({ estatus }: { estatus: string }) {
  const color =
    estatus === 'Activo'   ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
    estatus === 'Archivado'? 'bg-slate-500/15 text-slate-400 border-slate-600/30' :
                             'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
      {estatus || 'Sin estado'}
    </span>
  );
}

function AmbientesChips({ ambientes }: { ambientes: string }) {
  if (!ambientes?.trim()) return null;
  const envs = ambientes.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);
  const colorForEnv = (e: string) => {
    const lower = e.toLowerCase();
    if (lower.includes('prod')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-600/30';
    if (lower.includes('stag')) return 'bg-blue-500/10 text-blue-400 border-blue-600/30';
    if (lower.includes('dev'))  return 'bg-orange-500/10 text-orange-400 border-orange-600/30';
    return 'bg-slate-500/10 text-slate-400 border-slate-600/30';
  };
  return (
    <div className="flex flex-wrap gap-1">
      {envs.map((e) => (
        <span key={e} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${colorForEnv(e)}`}>
          {e}
        </span>
      ))}
    </div>
  );
}

// ─── Card de repositorio ───────────────────────────────────────────────────────

function RepoCard({ repo, canManage }: { repo: RepoEnriquecido; canManage: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const visibleCollabs = expanded ? repo.colaboradores : repo.colaboradores.slice(0, 5);
  const hasMore = repo.colaboradores.length > 5;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 hover:border-slate-700 transition-colors group">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <GitBranch className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate leading-snug" title={repo.nombre}>
              {repo.nombre || 'Sin nombre'}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <EstatusChip estatus={repo.estatus} />
              {repo.dpto && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />{repo.dpto}
                </span>
              )}
              {repo.producto && (
                <span className="text-[10px] text-slate-500">{repo.producto}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {repo.github && (
            <a
              href={repo.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title="Abrir en GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {canManage && (
            <button
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
              title="Editar repositorio"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ambientes */}
      {repo.ambientes && (
        <AmbientesChips ambientes={repo.ambientes} />
      )}

      {/* Separador */}
      <div className="border-t border-slate-800/60" />

      {/* Colaboradores */}
      {repo.colaboradores.length === 0 ? (
        <p className="text-xs text-slate-600 italic">Sin colaboradores registrados</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
            Colaboradores · {repo.colaboradores.length}
          </p>
          {visibleCollabs.map((c, i) => (
            <AvatarChip key={`${c.nombre}-${c.rol}-${i}`} nombre={c.nombre} rol={c.rol} />
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors mt-0.5"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Ver menos' : `Ver ${repo.colaboradores.length - 5} más`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dropdown genérico ────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
          value
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        {value || label}
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 max-h-64 overflow-y-auto">
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Todos
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  value === opt ? 'text-blue-300 bg-blue-500/10' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sección principal ────────────────────────────────────────────────────────

export default function RepositoriosSection({ isSuperadmin = false, activeEmpresa }: Props) {
  const [repos, setRepos] = useState<RepoEnriquecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDpto, setFilterDpto] = useState('');
  const [filterColaborador, setFilterColaborador] = useState('');
  const [filterRol, setFilterRol] = useState<RolAcceso | ''>('');

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/repositorios');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: RepoRecord[] = await res.json();
      setRepos(data.map(enrichRepo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar repositorios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  // Derivar opciones de filtro.
  const dptoOptions = useMemo(
    () => [...new Set(repos.map((r) => r.dpto).filter(Boolean))].sort(),
    [repos],
  );
  const colaboradorOptions = useMemo(
    () => [...new Set(repos.flatMap((r) => r.colaboradores.map((c) => c.nombre)))].sort(),
    [repos],
  );

  // Filtrado reactivo.
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return repos.filter((repo) => {
      if (q && !repo.nombre.toLowerCase().includes(q) && !repo.github.toLowerCase().includes(q)) return false;
      if (filterDpto && repo.dpto !== filterDpto) return false;
      if (filterColaborador && !repo.colaboradores.some((c) => c.nombre === filterColaborador)) return false;
      if (filterRol && !repo.colaboradores.some((c) => c.rol === filterRol)) return false;
      return true;
    });
  }, [repos, search, filterDpto, filterColaborador, filterRol]);

  const canManage = isSuperadmin; // Expandir con permisos finos en Fase 2.

  const hasFilters = search || filterDpto || filterColaborador || filterRol;

  function clearFilters() {
    setSearch('');
    setFilterDpto('');
    setFilterColaborador('');
    setFilterRol('');
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Repositorios" />

      <main className="flex-1 p-4 md:p-6 max-w-screen-2xl mx-auto w-full">
        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* Buscador */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              id="repos-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar repositorio…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown
              label="Departamento"
              options={dptoOptions}
              value={filterDpto}
              onChange={setFilterDpto}
            />
            <FilterDropdown
              label="Colaborador"
              options={colaboradorOptions}
              value={filterColaborador}
              onChange={setFilterColaborador}
            />
            <FilterDropdown
              label="Rol de acceso"
              options={ROLES_ORDER}
              value={filterRol}
              onChange={(v) => setFilterRol(v as RolAcceso | '')}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>

          {/* CTA nuevo (admin) */}
          {canManage && (
            <button
              id="btn-nuevo-repositorio"
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nuevo repositorio
            </button>
          )}
        </div>

        {/* Empresa activa (informativo) */}
        {activeEmpresa && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Empresa activa:
            </span>
            <span className="text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5">
              {activeEmpresa}
            </span>
            {isSuperadmin && !activeEmpresa && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                Vista global (todas las empresas)
              </span>
            )}
          </div>
        )}

        {/* Estados */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Cargando repositorios…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
            <button
              onClick={fetchRepos}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-3">
            <GitBranch className="w-10 h-10" />
            <p className="text-sm">
              {hasFilters ? 'Sin resultados para los filtros aplicados.' : 'No hay repositorios registrados.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Grid de cards */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-xs text-slate-500 mb-4">
              {filtered.length} repositorio{filtered.length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtrado)' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((repo) => (
                <RepoCard
                  key={repo.nombre}
                  repo={repo}
                  canManage={canManage}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
