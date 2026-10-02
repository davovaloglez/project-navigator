import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Network, LayoutDashboard, Search, Cpu, Database, Star, Sparkles, PanelLeftClose, PanelLeftOpen, ArrowLeft, LogOut, Loader2, Menu, X, Sun, Moon } from 'lucide-react';
import { useSheetData } from '../../../hooks/useSheetData';
import { useTheme, applyCs360Theme } from '../../../utils/theme';
import { authClient } from '../../../lib/authClient';
import type { CsCliente, CsClienteResumen, CsAiEntry } from '../../../utils/cs360';
import { esVital, parseFecha, CS360_AI_STORE_KEY } from '../../../utils/cs360';
import Avatar from '../../ui/Avatar';
import GlobalDashboard from './GlobalDashboard';
import ClientDetail from './ClientDetail';

type SortKey =
  | 'score_asc'
  | 'score_desc'
  | 'name_asc'
  | 'name_desc'
  | 'ranking_asc'
  | 'renovacion_asc'
  | 'alumnos_desc'
  | 'tickets_desc'
  | 'actividad_desc';

const CS360_SIDEBAR_KEY = 'pn-cs360-sidebar-collapsed';

function loadAiStore(): Record<string, CsAiEntry> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(CS360_AI_STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Card del usuario en sesión al pie del directorio. CS360 vive fuera del shell
 * de Project Navigator (sin Layout/Sidebar), así que no hay UserMenu: esta card
 * lo sustituye con tema claro propio.
 */
/** Botón Sol/Luna reutilizable (pie del directorio + barra superior móvil). */
function ThemeToggle({ theme, onToggle, className = '' }: { theme: 'dark' | 'light'; onToggle: () => void; className?: string }) {
  return (
    <button
      onClick={onToggle}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors ${className}`}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function SessionUserCard({
  user,
  theme,
  onToggleTheme,
}: {
  user: { name: string; email: string; image?: string | null };
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
      <a href="/cuenta" title="Mi cuenta" className="shrink-0">
        <Avatar name={user.name} image={user.image} size={36} />
      </a>
      <div className="flex-1 min-w-0">
        <a href="/cuenta" className="block text-sm font-medium text-slate-800 truncate hover:text-blue-600 transition-colors">
          {user.name}
        </a>
        <div className="text-xs text-slate-500 truncate">{user.email}</div>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
      </button>
    </div>
  );
}

/**
 * App standalone "Neural Intelligence 360" (réplica del mock aprobado en
 * mocks/healt-score/Neural360.html). Vive fuera del shell de Project Navigator:
 * se abre en su propia pestaña desde el sidebar y usa tema claro propio.
 *
 * Datos en dos niveles (el export real pesa ~44MB): la LISTA ligera
 * (`CsClienteResumen[]`, con score precalculado server-side) alimenta sidebar
 * y dashboard global; el DETALLE completo se pide por cliente al seleccionarlo.
 */
export default function Cs360App() {
  const { data: clientes, loading, error } = useSheetData<CsClienteResumen>('/api/cs360/clientes');
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user ?? null;

  // Tema: sigue la preferencia global de P-Nav (llave/evento compartidos), pero
  // CS360 default = claro y aplica la clase con su propia regla (nunca `light`).
  const { theme, toggle: toggleTheme } = useTheme('light', applyCs360Theme);

  const [aiStore, setAiStore] = useState<Record<string, CsAiEntry>>(loadAiStore);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('score_asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Drawer del directorio en móvil (<md): overlay sobre el main; en desktop no aplica.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(CS360_SIDEBAR_KEY) === '1';
  });
  // Hover-peek: al pasar el mouse por el riel colapsado, el directorio se asoma
  // POR ENCIMA del contenido sin alterar el estado colapsado persistido.
  const [peek, setPeek] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(CS360_SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        // localStorage bloqueado: la preferencia vive sólo en esta sesión.
      }
      return next;
    });
  }, []);

  // Desde el riel colapsado (o el botón móvil): abre el directorio y enfoca el buscador.
  const expandAndFocusSearch = useCallback(() => {
    setCollapsed(false);
    try {
      window.localStorage.setItem(CS360_SIDEBAR_KEY, '0');
    } catch {
      // localStorage bloqueado: la preferencia vive sólo en esta sesión.
    }
    setMobileNavOpen(true);
    // El input vive en el directorio expandido; enfocar tras el re-render.
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  // Detalle on-demand del cliente seleccionado.
  const [detalle, setDetalle] = useState<CsCliente | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const detalleAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (detalleAbortRef.current) detalleAbortRef.current.abort();
    setDetalle(null);
    setDetalleError(null);
    if (!selectedId) return;

    const controller = new AbortController();
    detalleAbortRef.current = controller;
    setDetalleLoading(true);
    fetch(`/api/cs360/clientes/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login?redirect=' + encodeURIComponent('/cs360');
          return null;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
        return json as CsCliente;
      })
      .then((json) => {
        if (json && !controller.signal.aborted) setDetalle(json);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setDetalleError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetalleLoading(false);
      });
    return () => controller.abort();
  }, [selectedId]);

  const getScore = useCallback(
    (c: CsClienteResumen): number => aiStore[c.id]?.score ?? c.score.total,
    [aiStore],
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const list = clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (c.alias ?? '').toLowerCase().includes(term) ||
        (c.numero_cliente ?? '').includes(term) ||
        c.id.toLowerCase().includes(term),
    );
    // Comparador nulls-last: los clientes sin dato van al final en cualquier dirección.
    const nullsLast = (a: number | null, b: number | null, dir: 1 | -1): number => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return (a - b) * dir;
    };
    list.sort((a, b) => {
      switch (sort) {
        case 'score_asc':
          return getScore(a) - getScore(b);
        case 'score_desc':
          return getScore(b) - getScore(a);
        case 'name_desc':
          return b.nombre.localeCompare(a.nombre);
        case 'ranking_asc':
          return nullsLast(a.kpi_financiero?.ranking ?? null, b.kpi_financiero?.ranking ?? null, 1);
        case 'renovacion_asc':
          return nullsLast(
            parseFecha(a.fecha_vigencia)?.getTime() ?? null,
            parseFecha(b.fecha_vigencia)?.getTime() ?? null,
            1,
          );
        case 'alumnos_desc':
          return (b.alumnos_vigentes ?? 0) - (a.alumnos_vigentes ?? 0);
        case 'tickets_desc':
          return (b.total_tickets ?? 0) - (a.total_tickets ?? 0);
        case 'actividad_desc':
          return (
            (b.total_actividades ?? 0) + (b.total_llamadas ?? 0) -
            ((a.total_actividades ?? 0) + (a.total_llamadas ?? 0))
          );
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });
    return list;
  }, [clientes, search, sort, getScore]);

  const selectedResumen = useMemo(
    () => clientes.find((c) => c.id === selectedId) ?? null,
    [clientes, selectedId],
  );

  const saveAiResult = useCallback((clienteId: string, entry: CsAiEntry) => {
    setAiStore((prev) => {
      const next = { ...prev, [clienteId]: entry };
      try {
        window.localStorage.setItem(CS360_AI_STORE_KEY, JSON.stringify(next));
      } catch {
        // localStorage lleno/bloqueado: el resultado vive sólo en memoria.
      }
      return next;
    });
  }, []);

  return (
    <div className="h-screen flex overflow-hidden text-slate-800 bg-slate-50">
      {/* Sidebar colapsado: riel angosto con accesos para reabrir */}
      {collapsed && (
        <aside
          onMouseEnter={() => setPeek(true)}
          className="w-12 bg-white border-r border-slate-200 flex-col items-center py-3 gap-3 h-full shadow-sm z-10 hidden md:flex print:hidden"
        >
          <a
            href="/"
            title="Volver a Project Navigator"
            aria-label="Volver a Project Navigator"
            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <button
            onClick={toggleCollapsed}
            title="Mostrar directorio"
            aria-label="Mostrar directorio"
            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedId(null)}
            title="Dashboard global"
            aria-label="Dashboard global"
            className={`p-2 rounded-lg transition-colors ${
              selectedId ? 'text-slate-500 hover:text-blue-600 hover:bg-slate-100' : 'text-blue-600 bg-blue-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button
            onClick={expandAndFocusSearch}
            title="Buscar cliente"
            aria-label="Buscar cliente"
            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          {sessionUser && (
            <a href="/cuenta" title={`${sessionUser.name} · Mi cuenta`} className="mt-auto shrink-0">
              <Avatar name={sessionUser.name} image={sessionUser.image} size={32} />
            </a>
          )}
        </aside>
      )}

      {/* Backdrop del drawer móvil */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden print:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Directorio. En <md es un drawer fijo (off-canvas); en md+ conserva el layout original.
          Colapsado + hover (peek): se asoma como overlay fijo POR ENCIMA del contenido (md:fixed), sin reflow. */}
      <aside
        onMouseLeave={() => setPeek(false)}
        className={`w-80 max-w-[85vw] md:max-w-none bg-white border-r border-slate-200 flex flex-col h-full shadow-sm print:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:transition-none ${
          !collapsed
            ? 'md:static md:z-10 md:flex'
            : peek
              ? 'md:fixed md:z-30 md:flex md:shadow-2xl'
              : 'md:hidden'
        }`}
      >
        <a
          href="/"
          className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Project Navigator
        </a>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800">
            <Network className="text-blue-600 w-5 h-5" />
            Directorio
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedId(null);
                setMobileNavOpen(false);
              }}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <LayoutDashboard className="w-4 h-4" /> Global
            </button>
            <button
              onClick={toggleCollapsed}
              title="Ocultar directorio"
              aria-label="Ocultar directorio"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors hidden md:block"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileNavOpen(false)}
              title="Cerrar directorio"
              aria-label="Cerrar directorio"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-slate-100 rounded-lg text-xs p-2 outline-none cursor-pointer text-slate-700"
          >
            <option value="score_asc">Score: Menor a Mayor</option>
            <option value="score_desc">Score: Mayor a Menor</option>
            <option value="name_asc">Nombre: A-Z</option>
            <option value="name_desc">Nombre: Z-A</option>
            <option value="ranking_asc">Ranking: Mejor primero</option>
            <option value="renovacion_asc">Renovación: Más próxima</option>
            <option value="alumnos_desc">Alumnos: Mayor a Menor</option>
            <option value="tickets_desc">Tickets: Mayor a Menor</option>
            <option value="actividad_desc">Actividad: Mayor a Menor</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => {
            const score = getScore(c);
            const scoreColor =
              score < 50
                ? 'text-red-600 bg-red-50 border-red-200'
                : score < 75
                  ? 'text-amber-600 bg-amber-50 border-amber-200'
                  : 'text-emerald-600 bg-emerald-50 border-emerald-200';
            const isActive = selectedId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  setMobileNavOpen(false);
                }}
                className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${
                  isActive ? 'bg-blue-50/50 border-l-blue-600' : 'border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-slate-800 text-sm truncate pr-2 flex items-center gap-1">
                    {c.nombre || c.alias}
                    {esVital(c) && (
                      <Star className="w-3 h-3 text-purple-500 fill-purple-500 shrink-0" aria-label="Cliente Vital (80/20)" />
                    )}
                  </div>
                  <div className={`px-2 py-0.5 rounded text-xs border font-bold flex items-center gap-1 ${scoreColor}`}>
                    {score}
                    {aiStore[c.id] && <Sparkles className="w-3 h-3 text-indigo-500" aria-label="Score ajustado por IA" />}
                  </div>
                </div>
                {/* HU NAV-80: Código / ID / Abreviatura en formato compacto */}
                <div className="text-[10px] text-slate-400 truncate mb-0.5">
                  ID {c.id} · Cód. {c.numero_cliente || '—'}
                  {c.alias && c.alias !== c.nombre ? ` · ${c.alias}` : ''}
                </div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Rank: #{c.kpi_financiero?.ranking ?? 'N/A'}</span>
                  <span className="truncate pl-2">{c.estatus || 'Sin estatus'}</span>
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-sm text-slate-400">Sin clientes que coincidan.</p>
          )}
        </div>

        {sessionUser && <SessionUserCard user={sessionUser} theme={theme} onToggleTheme={toggleTheme} />}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 print:hidden">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              title="Abrir directorio"
              aria-label="Abrir directorio"
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors md:hidden shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg sm:text-xl text-slate-800 truncate">Neural Intelligence 360</h1>
            <span className="text-xs text-slate-400 hidden lg:inline">Samva CS · Health Score de Clientes</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 text-green-700 text-sm font-medium">
              <Cpu className="w-4 h-4" />
              Motor IA: Nexus
            </div>
            {/* Toggle de tema visible en móvil (en desktop vive en el pie del directorio) */}
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="md:hidden" />
          </div>
        </header>

        {loading && (
          <div className="absolute inset-0 top-16 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Procesando información...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <Database className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">No se pudo cargar la cartera</h2>
            <p className="text-slate-500 max-w-md">{error}</p>
          </div>
        )}

        {!error && selectedId && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {detalleLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                <p className="text-slate-600 font-medium text-sm">Cargando datos del cliente...</p>
              </div>
            )}
            {detalleError && (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                  No se pudo cargar el detalle del cliente: {detalleError}
                </div>
              </div>
            )}
            {detalle && selectedResumen && (
              <ClientDetail
                key={detalle.id}
                cliente={detalle}
                baseScore={selectedResumen.score}
                aiEntry={aiStore[detalle.id] ?? null}
                onAiResult={(entry) => saveAiResult(detalle.id, entry)}
              />
            )}
          </div>
        )}

        {!error && !selectedId && (
          <div className="flex-1 overflow-y-auto">
            {!loading && clientes.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-700 mb-2">Bienvenido al Tablero de CS</h2>
                <p className="text-slate-500 max-w-md mx-auto">No hay clientes en la cartera todavía.</p>
              </div>
            ) : (
              <GlobalDashboard clientes={clientes} getScore={getScore} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
