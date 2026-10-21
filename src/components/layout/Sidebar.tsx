import { useMemo, useState } from 'react';
import { LayoutDashboard, FolderKanban, BookOpen, Users, Bell, FileText, CalendarRange, Map, PieChart, DollarSign, ListChecks, Sparkles, TrendingUp, MoreHorizontal, X, HelpCircle, ShieldCheck, Star, HeartPulse, ExternalLink, PanelLeftClose, PanelLeftOpen, GitBranch, ChevronDown, Building2 } from 'lucide-react';
import UserMenu from '../auth/UserMenu';

const allNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
  { href: '/resumen', label: 'Resumen', icon: FileText, pageKey: 'resumen' },
  { href: '/alertas', label: 'Alertas', icon: Bell, pageKey: 'alertas' },
  { href: '/portafolio', label: 'Portafolio', icon: FolderKanban, pageKey: 'portafolio' },
  { href: '/roadmap', label: 'Roadmap', icon: Map, pageKey: 'roadmap' },
  { href: '/timeline', label: 'Timeline', icon: CalendarRange, pageKey: 'timeline' },
  { href: '/cronograma', label: 'Cronograma', icon: ListChecks, pageKey: 'cronograma' },
  { href: '/pronosticos', label: 'Pronósticos', icon: TrendingUp, pageKey: 'pronosticos' },
  { href: '/costos', label: 'Costos', icon: DollarSign, pageKey: 'costos' },
  { href: '/distribucion', label: 'Puntos', icon: PieChart, pageKey: 'distribucion' },
  { href: '/equipo', label: 'Equipo', icon: Users, pageKey: 'equipo' },
  { href: '/repositorios', label: 'Repositorios', icon: GitBranch, pageKey: 'repositorios' },
  { href: '/comparativa', label: 'Comparativa', icon: Star, pageKey: 'comparativa' },
  { href: '/cursos', label: 'Cursos', icon: BookOpen, pageKey: 'cursos' },
  { href: '/novedades', label: 'Novedades', icon: Sparkles, pageKey: 'novedades' },
  { href: '/glosario', label: 'Glosario', icon: HelpCircle, pageKey: 'glosario' },
  // CS 360 es una app standalone dentro del proyecto: se abre en otra pestaña.
  { href: '/cs360', label: 'CS 360', icon: HeartPulse, pageKey: 'cs360', newTab: true },
  { href: '/admin', label: 'Admin', icon: ShieldCheck, pageKey: 'admin' },
] as Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  pageKey: string;
  newTab?: boolean;
}>;

interface SidebarProps {
  currentPath: string;
  user: { name: string; email: string; image?: string | null } | null;
  /** page-keys permitidas (de getEffectivePermissions). Si no se pasa, se muestran todas (no rompe usos previos). */
  allowedPages?: string[];
  /** Empresa activa del usuario (de Astro.locals). */
  activeEmpresa?: string | null;
  /** Si el usuario es superadministrador. */
  isSuperadmin?: boolean;
}

// El estado colapsado vive como clase `sidebar-collapsed` en <html> (aplicada
// pre-paint por el script inline de Layout.astro) y se persiste en localStorage.
// El aside, el <main> y el UserMenu reaccionan vía variantes CSS — el markup SSR
// es idéntico colapsado o no, así no hay mismatch de hidratación ni flash.
const COLLAPSED_KEY = 'pn-sidebar-collapsed';

function toggleCollapsed() {
  const collapsed = document.documentElement.classList.toggle('sidebar-collapsed');
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // localStorage no disponible (modo privado): el toggle sigue funcionando en la sesión
  }
}

/** Etiquetas de display para las empresas conocidas. Extender cuando haya más. */
const EMPRESA_LABELS: Record<string, string> = {
  'vortex-it': 'Vortex IT',
  'bit-technologies': 'Bit Technologies',
};

/**
 * Company Switcher: dropdown debajo del título que persiste la empresa activa
 * en la cookie `pn_active_empresa` vía POST /api/me/active-empresa.
 */
function CompanySwitcher({ activeEmpresa, isSuperadmin }: { activeEmpresa?: string | null; isSuperadmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const empresas = Object.entries(EMPRESA_LABELS);
  const activeLabel = activeEmpresa
    ? (EMPRESA_LABELS[activeEmpresa] ?? activeEmpresa)
    : 'Todas las empresas';

  async function handleSwitch(empresaId: string | null) {
    if (empresaId === activeEmpresa) { setOpen(false); return; }
    setSwitching(true);
    try {
      await fetch('/api/me/active-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      });
      // Recargar la página para que el middleware re-evalúe la cookie.
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="relative sidebar-mini:hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={switching}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-0.5 w-full group"
        title="Cambiar empresa activa"
      >
        <Building2 className="w-3 h-3 shrink-0" />
        <span className="truncate">{switching ? 'Cambiando…' : activeLabel}</span>
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1">
            {empresas.map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setOpen(false); handleSwitch(id); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeEmpresa === id
                    ? 'text-blue-300 bg-blue-500/10'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
            {isSuperadmin && (
              <>
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => { setOpen(false); handleSwitch(null); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    !activeEmpresa
                      ? 'text-amber-300 bg-amber-500/10'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  🌐 Todas las empresas
                </button>
                <div className="border-t border-slate-700 my-1" />
                <a
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:bg-slate-700 hover:text-blue-300 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Gestionar empresas…
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar({ currentPath, user, allowedPages, activeEmpresa, isSuperadmin }: SidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = useMemo(
    () =>
      allowedPages
        ? allNavItems.filter((item) => allowedPages.includes(item.pageKey))
        : allNavItems.filter((item) => item.pageKey !== 'admin'),
    [allowedPages]
  );
  const mobileMainItems = useMemo(() => navItems.slice(0, 4), [navItems]);
  const mobileMoreItems = useMemo(() => navItems.slice(4), [navItems]);
  const isMoreActive = mobileMoreItems.some(
    (item) => currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 sidebar-mini:w-16 transition-[width] duration-200 bg-slate-900 border-r border-slate-800 flex-col z-40 print:hidden">
        <div className="p-5 sidebar-mini:p-3 border-b border-slate-800 flex items-center justify-between sidebar-mini:justify-center gap-2">
          <div className="min-w-0 sidebar-mini:hidden">
            <h1 className="text-lg font-bold text-white tracking-tight">Project Navigator</h1>
            <CompanySwitcher activeEmpresa={activeEmpresa} isSuperadmin={isSuperadmin} />
          </div>
          <button
            onClick={toggleCollapsed}
            aria-label="Colapsar o expandir el menú"
            title="Colapsar / expandir menú"
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <PanelLeftClose className="w-4.5 h-4.5 sidebar-mini:hidden" />
            <PanelLeftOpen className="w-4.5 h-4.5 hidden sidebar-mini:block" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              !item.newTab &&
              (currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)));
            return (
              <a
                key={item.href}
                href={item.href}
                target={item.newTab ? '_blank' : undefined}
                rel={item.newTab ? 'noopener noreferrer' : undefined}
                title={item.label}
                className={`flex items-center gap-3 px-3 sidebar-mini:px-0 sidebar-mini:justify-center py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate sidebar-mini:hidden">{item.label}</span>
                {item.newTab && <ExternalLink className="w-3 h-3 ml-auto opacity-60 sidebar-mini:hidden" />}
              </a>
            );
          })}
        </nav>
        {user && (
          <div className="border-t border-slate-800 p-3">
            <UserMenu user={user} />
          </div>
        )}
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 print:hidden">
        {/* More menu panel */}
        {moreOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 p-3">
              <div className="grid grid-cols-3 gap-2">
                {mobileMoreItems.map((item) => {
                  const isActive =
                    !item.newTab &&
                    (currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)));
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target={item.newTab ? '_blank' : undefined}
                      rel={item.newTab ? 'noopener noreferrer' : undefined}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </a>
                  );
                })}
              </div>
              {user && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <UserMenu user={user} variant="inline" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Main nav bar */}
        <div className="flex">
          {mobileMainItems.map((item) => {
            const isActive =
              !item.newTab &&
              (currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)));
            return (
              <a
                key={item.href}
                href={item.href}
                target={item.newTab ? '_blank' : undefined}
                rel={item.newTab ? 'noopener noreferrer' : undefined}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            );
          })}
          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${moreOpen || isMoreActive ? 'text-blue-400' : 'text-slate-500'
              }`}
          >
            {moreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            Más
          </button>
        </div>
      </nav>
    </>
  );
}
