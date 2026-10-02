import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  User as UserIcon,
  ShieldCheck,
  Ban,
  RotateCcw,
  Monitor,
  Lock,
  Trash2,
  Camera,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { resizeImageFile } from '../../utils/imageResize';
import { ROLE_NAMES, DEFAULT_ROLE } from '../../lib/permissions/roles';
import { statement } from '../../lib/permissions/statements';
import { roleCan } from '../../lib/permissions/roleDefaults';
import type { Resource } from '../../lib/permissions/types';
import { translateAuthError } from '../../lib/authErrors';
import { GLOSSARY, getEntry } from '../../data/glossary';
import Header from '../layout/Header';
import Tooltip from '../ui/Tooltip';
import ConfirmModal from '../ui/ConfirmModal';
import { Avatar } from '../ui/Avatar';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
  createdAt?: string | Date;
}

interface SessionRow {
  id: string;
  token: string;
  createdAt?: string | Date;
  expiresAt?: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

type Effect = 'allow' | 'deny';
type TriState = 'inherit' | Effect;

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

function Banner({ status }: { status: Status }) {
  if (status.kind === 'success')
    return (
      <div className="flex items-center gap-2 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
        <Check className="w-4 h-4 shrink-0" /> {status.message}
      </div>
    );
  if (status.kind === 'error')
    return (
      <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 shrink-0" /> {status.message}
      </div>
    );
  return null;
}

function Card({
  icon,
  title,
  children,
  note,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {note && <p className="text-xs text-slate-500 mb-3">{note}</p>}
      <div className={note ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function TriToggle({
  value,
  disabled,
  roleDefault,
  onChange,
}: {
  value: TriState;
  disabled?: boolean;
  /** A qué resuelve "Hereda" según el rol (true=permite, false=deniega). */
  roleDefault?: boolean;
  onChange: (v: TriState) => void;
}) {
  const inheritLabel =
    roleDefault === undefined
      ? 'Hereda'
      : roleDefault
        ? 'Hereda ✓'
        : 'Hereda ✗';
  const opts: { v: TriState; label: string; cls: string }[] = [
    { v: 'inherit', label: inheritLabel, cls: 'bg-slate-700 text-slate-200' },
    { v: 'allow', label: 'Permitir', cls: 'bg-green-600 text-white' },
    { v: 'deny', label: 'Denegar', cls: 'bg-red-600 text-white' },
  ];
  return (
    <div className="flex items-center gap-2 shrink-0">
      {roleDefault !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            roleDefault
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
          title="Valor por defecto según el rol del usuario"
        >
          rol: {roleDefault ? 'Permitido' : 'Denegado'}
        </span>
      )}
      <div className="flex gap-1">
        {opts.map((o) => (
          <button
            key={o.v}
            disabled={disabled}
            title={
              o.v === 'inherit' && roleDefault !== undefined
                ? `Hereda del rol → ${roleDefault ? 'Permitido' : 'Denegado'}`
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              onChange(o.v);
            }}
            className={`text-[11px] px-2 py-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              value === o.v ? o.cls : 'bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Árbol de permisos: una página → sus bloques/datos/acciones ------------

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  resumen: 'Resumen',
  alertas: 'Alertas',
  portafolio: 'Portafolio',
  roadmap: 'Roadmap',
  timeline: 'Timeline',
  cronograma: 'Cronograma',
  pronosticos: 'Pronósticos',
  costos: 'Costos',
  distribucion: 'Puntos',
  equipo: 'Equipo',
  comparativa: 'Comparativa',
  cursos: 'Cursos',
  novedades: 'Novedades',
  glosario: 'Glosario',
  'metricas-dev': 'Métricas Dev',
  cs360: 'CS 360 (Salud de Clientes)',
  admin: 'Administración',
};

// Descripción corta de qué controla cada página (qué ve/usa el usuario si se
// permite; al denegar/heredar-denegado se le oculta y el server lo bloquea).
const PAGE_HINTS: Record<string, string> = {
  dashboard: 'Tablero principal con widgets configurables.',
  resumen: 'Resumen ejecutivo con health score del portafolio.',
  alertas: 'Centro de alertas automáticas (riesgo, vencimientos, bloqueos).',
  portafolio: 'Grid de proyectos con filtros y detalle por proyecto.',
  roadmap: 'Roadmap por hito y épica.',
  timeline: 'Vista Gantt con zoom y pronóstico.',
  cronograma: 'Tareas granulares (App + Core) con KPIs y throughput.',
  pronosticos: 'Motor de pronóstico (proyectos, planeación, dependencias).',
  costos: 'Análisis de costos del portafolio y modelo financiero (sensible).',
  distribucion: 'Distribución de story points.',
  equipo: 'Directorio del equipo y perfiles de persona.',
  comparativa: 'Comparativa cross-persona de autoevaluaciones trimestrales (privado, admin-only por default).',
  cursos: 'Seguimiento de cursos del equipo.',
  novedades: 'Historial de releases (changelog).',
  glosario: 'Documentación in-product de cada bloque del tablero.',
  'metricas-dev': 'Tabla comparativa de rendimiento de desarrolladores.',
  cs360:
    'Tablero standalone de Customer Success: health score de clientes, tickets, llamadas y análisis con IA. Admin-only por default.',
  admin: 'Módulo de administración: gestión de usuarios y permisos.',
};

const RESOURCE_HINTS: Record<string, string> = {
  'data:costos': 'Ver costos, tarifas por rol y el modelo financiero. Dato sensible.',
  'action:user:manage': 'Crear/editar usuarios, asignar roles, desactivar y revocar sesiones.',
  'action:snapshot:create': 'Permite que esta cuenta capture el snapshot semanal del portafolio.',
  'action:equipo:manage': 'Crear y editar miembros del registro `equipo` (sin tocar auth/usuarios).',
  'action:evaluacion:view-all': 'Ver las autoevaluaciones trimestrales de todas las personas (privado). Sólo admin por default.',
  'action:evaluacion:manage': 'Crear / editar / borrar evaluaciones trimestrales de cualquier persona. Sólo admin por default.',
};

function hintFor(id: string): string | undefined {
  if (RESOURCE_HINTS[id]) return RESOURCE_HINTS[id];
  if (id.startsWith('block:')) return getEntry(id.slice('block:'.length))?.summary;
  return undefined;
}

// Secciones de detalle del glosario que cuelgan de una página del sidebar.
const SECTION_TO_PAGE: Record<string, string> = {
  'proyecto-detalle': 'portafolio',
  'pronosticos-detalle': 'pronosticos',
  'persona-detalle': 'equipo',
};

function pageOfSection(slug: string): string {
  return SECTION_TO_PAGE[slug] ?? slug;
}

interface ResourceLeaf {
  id: string;
  label: string;
}
interface PageNode {
  pageKey: string;
  label: string;
  pageResource: string;
  children: ResourceLeaf[];
}

const PAGE_TREE: PageNode[] = statement.page.map((pageKey) => {
  const children: ResourceLeaf[] = [];
  if (pageKey === 'costos') children.push({ id: 'data:costos', label: 'Datos de costos (financiero)' });
  if (pageKey === 'admin') children.push({ id: 'action:user:manage', label: 'Gestión de usuarios' });
  for (const e of GLOSSARY) {
    if (pageOfSection(e.sectionSlug) === pageKey) {
      children.push({ id: `block:${e.id}`, label: e.title });
    }
  }
  return {
    pageKey,
    label: PAGE_LABELS[pageKey] ?? pageKey,
    pageResource: `page:${pageKey}`,
    children,
  };
});

// Acciones que no cuelgan de una página concreta (transversales).
const GENERAL_ACTIONS: ResourceLeaf[] = [
  { id: 'action:snapshot:create', label: 'Captura de snapshots semanales' },
];

function EquipoLinkBlock({ userId }: { userId: string }) {
  const [list, setList] = useState<{ id: string; fullName: string }[]>([]);
  const [current, setCurrent] = useState('');
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [sel, setSel] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: 'loading' });
    Promise.all([
      fetch('/api/equipo', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error()))),
      fetch(`/api/admin/user-equipo?userId=${encodeURIComponent(userId)}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error()))),
    ])
      .then(([eq, link]: [{ equipo: { id: string; fullName: string }[] }, { equipoId: string | null; equipoName: string | null }]) => {
        if (cancelled) return;
        setList(eq.equipo.map((e) => ({ id: e.id, fullName: e.fullName })));
        setCurrent(link.equipoId ?? '');
        setSel(link.equipoId ?? '');
        setCurrentName(link.equipoName);
        setStatus({ kind: 'idle' });
      })
      .catch(() => !cancelled && setStatus({ kind: 'error', message: 'No se pudo cargar el registro de equipo.' }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/user-equipo', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, equipoId: sel }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', message: b.error || `Error ${res.status}` });
        return;
      }
      setCurrent(sel);
      setCurrentName(sel ? list.find((p) => p.id === sel)?.fullName ?? null : null);
      setStatus({ kind: 'success', message: sel ? 'Vínculo actualizado.' : 'Vínculo eliminado.' });
    } catch {
      setStatus({ kind: 'error', message: 'Error de red.' });
    } finally {
      setSaving(false);
    }
  };

  const dirty = sel !== current;
  return (
    <Card
      icon={<UserIcon className="w-5 h-5 text-blue-400" />}
      title="Persona del equipo"
      note="Vincula esta cuenta de login con una persona del registro de equipo. Habilita el scoping por identidad (qué proyectos/tareas ve)."
    >
      {status.kind === 'loading' ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Actual:{' '}
            {currentName ? (
              <span className="text-white">{currentName}</span>
            ) : (
              <span className="text-slate-500">sin vincular (rol scopeado → no ve datos)</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">— Sin vincular —</option>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id})
                </option>
              ))}
            </select>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          <Banner status={status} />
        </div>
      )}
    </Card>
  );
}

function PermissionsBlock({ userId, role, locked }: { userId: string; role: string; locked: boolean }) {
  const [map, setMap] = useState<Record<string, Effect>>({});
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: 'loading' });
    fetch(`/api/admin/overrides?userId=${encodeURIComponent(userId)}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { overrides: { resource: string; effect: Effect }[] }) => {
        if (cancelled) return;
        const m: Record<string, Effect> = {};
        for (const o of data.overrides) m[o.resource] = o.effect;
        setMap(m);
        setStatus({ kind: 'idle' });
      })
      .catch(() => !cancelled && setStatus({ kind: 'error', message: 'No se pudieron cargar los overrides.' }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const apply = async (resource: string, next: TriState) => {
    try {
      if (next === 'inherit') {
        await fetch(
          `/api/admin/overrides?userId=${encodeURIComponent(userId)}&resource=${encodeURIComponent(resource)}`,
          { method: 'DELETE', credentials: 'same-origin' }
        );
        setMap((m) => {
          const rest = { ...m };
          delete rest[resource];
          return rest;
        });
      } else {
        await fetch('/api/admin/overrides', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, resource, effect: next }),
        });
        setMap((m) => ({ ...m, [resource]: next }));
      }
    } catch {
      setStatus({ kind: 'error', message: 'No se pudo guardar el cambio.' });
    }
  };

  const toggleOpen = (key: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  return (
    <Card
      icon={<Lock className="w-5 h-5 text-blue-400" />}
      title="Permisos"
      note={
        locked
          ? 'No puedes editar tus propios permisos (protección anti-bloqueo).'
          : `Permitir = el usuario VE/usa el elemento · Denegar = se le OCULTA · Hereda = lo que diga su rol (${role}). Los overrides aplican sólo a este usuario. Si una página se deniega, sus bloques internos quedan ocultos aunque estén en “Permitir”.`
      }
    >
      <div className="mb-3">
        <Banner status={status} />
      </div>

      <div className="space-y-2">
        {PAGE_TREE.map((node) => {
          const isOpen = open.has(node.pageKey);
          const hasChildren = node.children.length > 0;
          return (
            <div key={node.pageKey} className="border border-slate-700/50 rounded-lg overflow-hidden">
              <div
                className={`flex items-center gap-3 px-3 py-2 bg-slate-800/60 ${
                  hasChildren ? 'cursor-pointer hover:bg-slate-800' : ''
                }`}
                onClick={hasChildren ? () => toggleOpen(node.pageKey) : undefined}
              >
                <span className="w-4 shrink-0 text-slate-500">
                  {hasChildren ? (
                    isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )
                  ) : null}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-200">
                    {node.label}
                    {hasChildren && (
                      <span className="ml-2 text-[10px] text-slate-500">
                        {node.children.length} elemento{node.children.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                  {PAGE_HINTS[node.pageKey] && (
                    <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                      {PAGE_HINTS[node.pageKey]}
                    </span>
                  )}
                </span>
                <TriToggle
                  value={map[node.pageResource] ?? 'inherit'}
                  disabled={locked}
                  roleDefault={roleCan(role, node.pageResource as Resource)}
                  onChange={(v) => apply(node.pageResource, v)}
                />
              </div>
              {isOpen && hasChildren && (
                <div className="divide-y divide-slate-800 bg-slate-900/40">
                  {node.children.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-3 px-3 py-2 pl-10">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-300">{c.label}</span>
                        {hintFor(c.id) && (
                          <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                            {hintFor(c.id)}
                          </span>
                        )}
                      </span>
                      <TriToggle
                        value={map[c.id] ?? 'inherit'}
                        disabled={locked}
                        roleDefault={roleCan(role, c.id as Resource)}
                        onChange={(v) => apply(c.id, v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Acciones transversales (no dependen de una página) */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Acciones generales
          </div>
          <div className="divide-y divide-slate-800 bg-slate-900/40">
            {GENERAL_ACTIONS.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-300">{c.label}</span>
                  {hintFor(c.id) && (
                    <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                      {hintFor(c.id)}
                    </span>
                  )}
                </span>
                <TriToggle
                  value={map[c.id] ?? 'inherit'}
                  disabled={locked}
                  roleDefault={roleCan(role, c.id as Resource)}
                  onChange={(v) => apply(c.id, v)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SessionsBlock({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [confirm, setConfirm] = useState<{ kind: 'one'; token: string } | { kind: 'all' } | null>(
    null
  );

  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    const { data, error } = await authClient.admin.listUserSessions({ userId });
    if (error) {
      setStatus({ kind: 'error', message: translateAuthError(error, 'No se pudieron cargar las sesiones.') });
      return;
    }
    setSessions(((data as { sessions?: SessionRow[] })?.sessions ?? []) as SessionRow[]);
    setStatus({ kind: 'idle' });
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const doConfirm = async () => {
    if (!confirm) return;
    const { error } =
      confirm.kind === 'one'
        ? await authClient.admin.revokeUserSession({ sessionToken: confirm.token })
        : await authClient.admin.revokeUserSessions({ userId });
    setConfirm(null);
    if (error) {
      setStatus({ kind: 'error', message: translateAuthError(error, 'No se pudo cerrar la sesión.') });
      return;
    }
    await load();
  };

  return (
    <Card icon={<Monitor className="w-5 h-5 text-blue-400" />} title="Sesiones activas">
      <div className="mb-3">
        <Banner status={status} />
      </div>
      {sessions && sessions.length === 0 && (
        <p className="text-sm text-slate-500">Sin sesiones activas.</p>
      )}
      {sessions && sessions.length > 0 && (
        <>
          <button
            onClick={() => setConfirm({ kind: 'all' })}
            className="mb-3 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          >
            <Ban className="w-4 h-4" /> Cerrar todas
          </button>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-slate-300 truncate">{s.userAgent ?? 'Agente desconocido'}</div>
                  <div>
                    IP: {s.ipAddress ?? '—'} · Expira:{' '}
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—'}
                  </div>
                </div>
                <Tooltip label="Cerrar sesión">
                  <button
                    onClick={() => setConfirm({ kind: 'one', token: s.token })}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800"
                    aria-label="Cerrar sesión"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        </>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'all' ? 'Cerrar todas las sesiones' : 'Cerrar esta sesión'}
          message={
            confirm.kind === 'all'
              ? 'El usuario será desconectado de todos sus dispositivos. ¿Continuar?'
              : 'El usuario será desconectado de este dispositivo. ¿Continuar?'
          }
          confirmLabel="Cerrar sesión"
          onConfirm={doConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Card>
  );
}

export default function AdminUserSection({
  userId,
  currentUserId,
}: {
  userId: string;
  currentUserId: string;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  const [name, setName] = useState('');
  const [profileStatus, setProfileStatus] = useState<Status>({ kind: 'idle' });
  const [avatarStatus, setAvatarStatus] = useState<Status>({ kind: 'idle' });
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roleStatus, setRoleStatus] = useState<Status>({ kind: 'idle' });
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('');
  const [banStatus, setBanStatus] = useState<Status>({ kind: 'idle' });

  const isSelf = currentUserId !== '' && currentUserId === userId;

  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    const [one, all] = await Promise.all([
      authClient.admin.listUsers({ query: { filterField: 'id', filterValue: userId, limit: 1 } }),
      authClient.admin.listUsers({ query: { limit: 500 } }),
    ]);
    if (one.error) {
      setStatus({ kind: 'error', message: translateAuthError(one.error, 'No se pudo cargar el usuario.') });
      return;
    }
    const found = ((one.data as { users?: AdminUser[] })?.users ?? [])[0] ?? null;
    if (!found) {
      setStatus({ kind: 'error', message: 'Usuario no encontrado.' });
      return;
    }
    setUser(found);
    setName(found.name);
    const allUsers = ((all.data as { users?: AdminUser[] })?.users ?? []) as AdminUser[];
    setAdminCount(allUsers.filter((u) => (u.role ?? '') === 'admin').length);
    setStatus({ kind: 'idle' });
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isAdminTarget = (user?.role ?? '') === 'admin';
  const isLastAdmin = isAdminTarget && (adminCount ?? 0) <= 1;
  const roleLocked = isSelf || isLastAdmin;
  const permsLocked = isSelf;
  const banLocked = isSelf;

  const saveName = async () => {
    if (!user || !name.trim() || name.trim() === user.name) return;
    setProfileStatus({ kind: 'loading' });
    const { error } = await authClient.admin.updateUser({
      userId: user.id,
      data: { name: name.trim() },
    });
    if (error) {
      setProfileStatus({ kind: 'error', message: translateAuthError(error) });
      return;
    }
    setProfileStatus({ kind: 'success', message: 'Nombre actualizado.' });
    void load();
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setAvatarStatus({ kind: 'loading' });
    try {
      const resized = await resizeImageFile(file);
      const form = new FormData();
      form.append('userId', user.id);
      form.append('file', resized, 'avatar.jpg');
      const res = await fetch('/api/admin/avatar', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setAvatarStatus({ kind: 'error', message: data.error ?? 'No se pudo subir la imagen.' });
        return;
      }
      const { error } = await authClient.admin.updateUser({ userId: user.id, data: { image: data.url } });
      if (error) {
        setAvatarStatus({ kind: 'error', message: translateAuthError(error) });
        return;
      }
      setAvatarStatus({ kind: 'success', message: 'Foto actualizada.' });
      void load();
    } catch (err) {
      setAvatarStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Error al procesar la imagen.' });
    }
  };

  const onAvatarRemove = async () => {
    if (!user) return;
    setAvatarStatus({ kind: 'loading' });
    try {
      const res = await fetch(`/api/admin/avatar?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAvatarStatus({ kind: 'error', message: data.error ?? 'No se pudo quitar la foto.' });
        return;
      }
      const { error } = await authClient.admin.updateUser({ userId: user.id, data: { image: null } });
      if (error) {
        setAvatarStatus({ kind: 'error', message: translateAuthError(error) });
        return;
      }
      setAvatarStatus({ kind: 'success', message: 'Foto eliminada.' });
      void load();
    } catch {
      setAvatarStatus({ kind: 'error', message: 'No se pudo quitar la foto.' });
    }
  };

  const changeRole = async (role: string) => {
    if (!user) return;
    setRoleStatus({ kind: 'loading' });
    const { error } = await authClient.admin.setRole({ userId: user.id, role: role as never });
    if (error) {
      setRoleStatus({ kind: 'error', message: translateAuthError(error) });
      return;
    }
    setRoleStatus({ kind: 'success', message: 'Rol actualizado.' });
    void load();
  };

  const doBan = async () => {
    if (!user) return;
    setBanStatus({ kind: 'loading' });
    const days = Number(banDays);
    const { error } = await authClient.admin.banUser({
      userId: user.id,
      banReason: banReason.trim() || 'Desactivado por administrador',
      ...(days > 0 ? { banExpiresIn: days * 86400 } : {}),
    });
    if (error) {
      setBanStatus({ kind: 'error', message: translateAuthError(error) });
      return;
    }
    setBanStatus({ kind: 'success', message: 'Usuario desactivado.' });
    setBanReason('');
    setBanDays('');
    void load();
  };

  const doUnban = async () => {
    if (!user) return;
    setBanStatus({ kind: 'loading' });
    const { error } = await authClient.admin.unbanUser({ userId: user.id });
    if (error) {
      setBanStatus({ kind: 'error', message: translateAuthError(error) });
      return;
    }
    setBanStatus({ kind: 'success', message: 'Usuario reactivado.' });
    void load();
  };

  const back = (
    <a
      href="/admin"
      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Volver a usuarios
    </a>
  );

  if (status.kind === 'loading' && !user) {
    return (
      <div>
        {back}
        <Header title="Usuario" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 animate-pulse h-48" />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        {back}
        <Header title="Usuario" />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400">
          {status.kind === 'error' ? status.message : 'Usuario no encontrado.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {back}
      <Header title={user.name} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Perfil (incluye Rol) */}
        <Card icon={<UserIcon className="w-5 h-5 text-blue-400" />} title="Perfil">
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={user.name} image={user.image} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-200 truncate">{user.email}</div>
              <div className="text-xs text-slate-500 mb-2">
                Alta: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onAvatarFile}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={avatarStatus.kind === 'loading'}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {avatarStatus.kind === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  Cambiar foto
                </button>
                {user.image && (
                  <button
                    type="button"
                    disabled={avatarStatus.kind === 'loading'}
                    onClick={() => setConfirmRemoveAvatar(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Quitar
                  </button>
                )}
              </div>
              {avatarStatus.kind !== 'idle' && avatarStatus.kind !== 'loading' && (
                <div className="mt-2">
                  <Banner status={avatarStatus} />
                </div>
              )}
            </div>
          </div>

          <label className="block text-xs text-slate-500 mb-1">Nombre</label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={saveName}
              disabled={profileStatus.kind === 'loading' || name.trim() === user.name || !name.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
            >
              {profileStatus.kind === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>
          {profileStatus.kind !== 'idle' && (
            <div className="mb-4">
              <Banner status={profileStatus} />
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-200">Rol</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {roleLocked
                ? isSelf
                  ? 'No puedes cambiar tu propio rol (protección anti-bloqueo).'
                  : 'Es el único administrador: asigna admin a otro usuario antes de cambiarlo.'
                : 'Define las capacidades por defecto del usuario.'}
            </p>
            <select
              value={ROLE_NAMES.includes((user.role ?? DEFAULT_ROLE) as never) ? user.role ?? DEFAULT_ROLE : DEFAULT_ROLE}
              disabled={roleLocked || roleStatus.kind === 'loading'}
              onChange={(e) => changeRole(e.target.value)}
              className="text-sm rounded-lg border px-3 py-2 bg-slate-800 border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ROLE_NAMES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {roleStatus.kind !== 'idle' && (
              <div className="mt-3">
                <Banner status={roleStatus} />
              </div>
            )}
          </div>
        </Card>

        {/* Estado de la cuenta (a la derecha de Perfil) */}
        <Card
          icon={<Ban className="w-5 h-5 text-blue-400" />}
          title="Estado de la cuenta"
          note={banLocked ? 'No puedes desactivarte a ti mismo.' : undefined}
        >
          {user.banned ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <Ban className="w-4 h-4 shrink-0" /> Cuenta desactivada
              </div>
              {user.banReason && (
                <p className="text-xs text-slate-400">
                  Motivo: <span className="text-slate-300">{user.banReason}</span>
                </p>
              )}
              {user.banExpires && (
                <p className="text-xs text-slate-500">
                  Expira: {new Date(user.banExpires).toLocaleString()}
                </p>
              )}
              <button
                onClick={doUnban}
                disabled={banStatus.kind === 'loading'}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Reactivar cuenta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Motivo de la desactivación</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  disabled={banLocked}
                  rows={2}
                  placeholder="Ej: baja temporal, fin de contrato…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Expira en (días, opcional — vacío = permanente)
                </label>
                <input
                  type="number"
                  min="0"
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  disabled={banLocked}
                  className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <button
                onClick={doBan}
                disabled={banLocked || banStatus.kind === 'loading'}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Ban className="w-4 h-4" /> Desactivar cuenta
              </button>
            </div>
          )}
          {banStatus.kind !== 'idle' && (
            <div className="mt-3">
              <Banner status={banStatus} />
            </div>
          )}
        </Card>

        {/* Persona del equipo */}
        <div className="lg:col-span-2">
          <EquipoLinkBlock userId={user.id} />
        </div>

        {/* Sesiones */}
        <div className="lg:col-span-2">
          <SessionsBlock userId={user.id} />
        </div>

        {/* Permisos */}
        <div className="lg:col-span-2">
          <PermissionsBlock userId={user.id} role={user.role ?? DEFAULT_ROLE} locked={permsLocked} />
        </div>
      </div>

      {confirmRemoveAvatar && (
        <ConfirmModal
          title="Quitar foto de perfil"
          message={`Se eliminará la foto de ${user.name} y volverá a las iniciales. Si entró con Google, su foto de Google no se restaura automáticamente hasta un nuevo inicio de sesión.`}
          confirmLabel="Quitar foto"
          onConfirm={async () => {
            await onAvatarRemove();
            setConfirmRemoveAvatar(false);
          }}
          onCancel={() => setConfirmRemoveAvatar(false)}
        />
      )}
    </div>
  );
}
