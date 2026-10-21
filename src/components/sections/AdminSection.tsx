import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Loader2,
  Check,
  AlertCircle,
  ShieldCheck,
  Search,
  ChevronRight,
  Ban,
  Building2,
  Plus,
  Edit2,
  Users,
  FolderKanban,
  Building,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { ROLE_NAMES, DEFAULT_ROLE } from '../../lib/permissions/roles';
import { translateAuthError } from '../../lib/authErrors';
import Header from '../layout/Header';
import { Avatar } from '../ui/Avatar';

interface EmpresaMetrics {
  id: string;
  nombre: string;
  moneda: string;
  activa: boolean;
  logo_url: string | null;
  total_miembros: number;
  proyectos_activos: number;
  total_departamentos: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt?: string | Date;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

function StatusBanner({ status }: { status: Status }) {
  if (status.kind === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
        <Check className="w-4 h-4 shrink-0" />
        {status.message}
      </div>
    );
  }
  if (status.kind === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {status.message}
      </div>
    );
  }
  return null;
}

function roleBadgeClass(role?: string | null): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'directores':
    case 'gerentes':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'pm':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'ventas':
      return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    default:
      return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  }
}

function CreateUserBlock({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(DEFAULT_ROLE);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!email.trim() || !name.trim() || password.length < 8) {
      setStatus({ kind: 'error', message: 'Email, nombre y password (≥8 caracteres) son obligatorios.' });
      return;
    }
    setStatus({ kind: 'loading' });
    const { error } = await authClient.admin.createUser({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password,
      role: role as never,
    });
    if (error) {
      setStatus({ kind: 'error', message: translateAuthError(error, 'No se pudo crear el usuario.') });
      return;
    }
    setStatus({ kind: 'success', message: `Usuario ${email.trim().toLowerCase()} creado.` });
    setEmail('');
    setName('');
    setPassword('');
    setRole(DEFAULT_ROLE);
    onCreated();
  };

  const loading = status.kind === 'loading';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-blue-400" />
        <h3 className="text-base font-semibold text-white">Crear usuario</h3>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="email"
          placeholder="email@vortex-it.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password (≥8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
        >
          {ROLE_NAMES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Crear
        </button>
      </form>
      <div className="mt-3">
        <StatusBanner status={status} />
      </div>
    </div>
  );
}

function UserCard({ u }: { u: AdminUser }) {
  return (
    <a
      href={`/admin/${u.id}`}
      className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <Avatar name={u.name} image={u.image} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-100 truncate">{u.name}</div>
          <div className="text-xs text-slate-500 truncate">{u.email}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors shrink-0" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[11px] rounded-md border px-2 py-0.5 ${roleBadgeClass(u.role)}`}
        >
          {u.role ?? DEFAULT_ROLE}
        </span>
        {u.banned ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-0.5">
            <Ban className="w-3 h-3" /> Desactivado
          </span>
        ) : (
          <span className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-0.5">
            Activo
          </span>
        )}
      </div>
      {u.banned && u.banReason && (
        <p className="text-[11px] text-slate-500 italic truncate">Motivo: {u.banReason}</p>
      )}
    </a>
  );
}

function EmpresaModal({
  empresa,
  onClose,
  onSaved,
}: {
  empresa: EmpresaMetrics | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(empresa);
  const [id, setId] = useState(empresa?.id ?? '');
  const [nombre, setNombre] = useState(empresa?.nombre ?? '');
  const [moneda, setMoneda] = useState(empresa?.moneda ?? 'MXN');
  const [logoUrl, setLogoUrl] = useState(empresa?.logo_url ?? '');
  const [activa, setActiva] = useState(empresa ? empresa.activa : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !nombre.trim()) {
      setError('ID y Nombre son obligatorios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/empresas', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim().toLowerCase(),
          nombre: nombre.trim(),
          moneda: moneda.trim(),
          logo_url: logoUrl.trim() || null,
          ...(isEditing ? { activa } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar empresa');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <h3 className="text-lg font-bold text-white mb-4">
          {isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
        </h3>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">ID (slug) *</label>
            <input
              type="text"
              value={id}
              disabled={isEditing}
              onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="e.g. acme-corp"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Comercial *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="MXN">MXN (Pesos)</option>
                <option value="USD">USD (Dólares)</option>
                <option value="EUR">EUR (Euros)</option>
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
                <select
                  value={activa ? '1' : '0'}
                  onChange={(e) => setActiva(e.target.value === '1')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="1">Activa</option>
                  <option value="0">Inactiva</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">URL del Logo (Opcional)</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Registrar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmpresasTab({ canManage }: { canManage: boolean }) {
  const [empresas, setEmpresas] = useState<EmpresaMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalEmpresa, setModalEmpresa] = useState<EmpresaMetrics | null | 'new'>(null);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/empresas');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: EmpresaMetrics[] = await res.json();
      setEmpresas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Empresas y Organizaciones ({empresas.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión multi-empresa: tenants, métricas consolidadas y configuración global.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setModalEmpresa('new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando empresas…
        </div>
      )}

      {!loading && error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={fetchEmpresas} className="ml-auto underline text-xs">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((emp) => (
            <div
              key={emp.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col justify-between gap-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0 font-bold">
                      {emp.logo_url ? (
                        <img src={emp.logo_url} alt={emp.nombre} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <Building className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                        {emp.nombre}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">{emp.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {emp.activa ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5">
                        <XCircle className="w-3 h-3" /> Inactiva
                      </span>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setModalEmpresa(emp)}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                        title="Editar empresa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center">
                  <div className="bg-slate-800/40 rounded-lg p-2">
                    <div className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" /> Miembros
                    </div>
                    <div className="text-base font-bold text-white mt-0.5">{emp.total_miembros}</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-2">
                    <div className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1">
                      <FolderKanban className="w-3 h-3 text-slate-500" /> Proyectos
                    </div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{emp.proyectos_activos}</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-2">
                    <div className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" /> Dptos
                    </div>
                    <div className="text-base font-bold text-blue-400 mt-0.5">{emp.total_departamentos}</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/50">
                <span>Moneda: <strong className="text-slate-400">{emp.moneda}</strong></span>
                <span className="text-slate-600">Multi-tenant activo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalEmpresa && (
        <EmpresaModal
          empresa={modalEmpresa === 'new' ? null : modalEmpresa}
          onClose={() => setModalEmpresa(null)}
          onSaved={() => {
            setModalEmpresa(null);
            fetchEmpresas();
          }}
        />
      )}
    </div>
  );
}

interface AdminSectionProps {
  isSuperadmin?: boolean;
  canManageEmpresas?: boolean;
}

export default function AdminSection({ isSuperadmin = false, canManageEmpresas = false }: AdminSectionProps) {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'empresas'>('usuarios');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setStatus({ kind: 'loading' });
    const { data, error } = await authClient.admin.listUsers({
      query: { limit: 500, sortBy: 'createdAt', sortDirection: 'desc' },
    });
    if (error) {
      setStatus({ kind: 'error', message: translateAuthError(error, 'No se pudieron cargar los usuarios.') });
      return;
    }
    setUsers(((data as { users?: AdminUser[] })?.users ?? []) as AdminUser[]);
    setStatus({ kind: 'idle' });
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const showEmpresasTab = isSuperadmin || canManageEmpresas;

  return (
    <div>
      <Header title="Administración" onRefresh={fetchUsers} loading={status.kind === 'loading'} />

      {/* Selector de pestañas */}
      {showEmpresasTab && (
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'usuarios'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('empresas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'empresas'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresas
          </button>
        </div>
      )}

      {activeTab === 'usuarios' ? (
        <div className="space-y-4">
          <CreateUserBlock onCreated={fetchUsers} />

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-semibold text-white">
                  Usuarios {users ? <span className="text-slate-500">({users.length})</span> : null}
                </h3>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-3">
              <StatusBanner status={status} />
            </div>

            {users && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((u) => (
                  <UserCard key={u.id} u={u} />
                ))}
              </div>
            )}
            {users && filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Sin resultados.</p>
            )}
            {!users && status.kind === 'loading' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse h-28" />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmpresasTab canManage={showEmpresasTab} />
      )}
    </div>
  );
}
