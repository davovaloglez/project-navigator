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
} from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { ROLE_NAMES, DEFAULT_ROLE } from '../../lib/permissions/roles';
import { translateAuthError } from '../../lib/authErrors';
import Header from '../layout/Header';
import { Avatar } from '../ui/Avatar';

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
          placeholder="email@bit.lat"
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

export default function AdminSection() {
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

  return (
    <div>
      <Header title="Administración" onRefresh={fetchUsers} loading={status.kind === 'loading'} />
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
    </div>
  );
}
