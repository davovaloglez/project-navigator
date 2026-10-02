import { useCallback, useEffect, useRef, useState } from 'react';
import {
  User,
  KeyRound,
  SlidersHorizontal,
  Loader2,
  Check,
  AlertCircle,
  Camera,
  Trash2,
  Monitor,
  Smartphone,
  LogOut,
  Shield,
  Terminal,
  Copy,
  Plus,
} from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { resizeImageFile } from '../../utils/imageResize';
import ConfirmModal from '../ui/ConfirmModal';
import Header from '../layout/Header';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
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

function clearAllPersistedFiltersLocal() {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith('pn-prefs-')) keys.push(k);
  }
  for (const k of keys) window.localStorage.removeItem(k);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProfileBlock({ user }: { user: SessionUser }) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [avatarStatus, setAvatarStatus] = useState<Status>({ kind: 'idle' });
  // undefined = usa user.image; null/string = override local tras subir/quitar
  const [localImage, setLocalImage] = useState<string | null | undefined>(undefined);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shownImage = localImage !== undefined ? localImage : user.image;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo
    if (!file) return;
    setAvatarStatus({ kind: 'loading' });
    try {
      const resized = await resizeImageFile(file);
      const form = new FormData();
      form.append('file', resized, 'avatar.jpg');
      const res = await fetch('/api/me/avatar', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setAvatarStatus({ kind: 'error', message: data.error ?? 'No se pudo subir la imagen.' });
        return;
      }
      const { error } = await authClient.updateUser({ image: data.url });
      if (error) {
        setAvatarStatus({ kind: 'error', message: error.message ?? 'No se pudo guardar la foto.' });
        return;
      }
      setLocalImage(data.url);
      setAvatarStatus({ kind: 'success', message: 'Foto actualizada.' });
    } catch (err) {
      setAvatarStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Error al procesar la imagen.' });
    }
  };

  const onRemove = async () => {
    setAvatarStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/me/avatar', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAvatarStatus({ kind: 'error', message: data.error ?? 'No se pudo quitar la foto.' });
        return;
      }
      const { error } = await authClient.updateUser({ image: null });
      if (error) {
        setAvatarStatus({ kind: 'error', message: error.message ?? 'No se pudo quitar la foto.' });
        return;
      }
      setLocalImage(null);
      setAvatarStatus({ kind: 'success', message: 'Foto eliminada.' });
    } catch {
      setAvatarStatus({ kind: 'error', message: 'No se pudo quitar la foto.' });
    }
  };

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus({ kind: 'error', message: 'El nombre no puede estar vacío.' });
      return;
    }
    if (trimmed === user.name) {
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'loading' });
    const { error } = await authClient.updateUser({ name: trimmed });
    if (error) {
      setStatus({ kind: 'error', message: error.message ?? 'No se pudo actualizar el perfil.' });
      return;
    }
    setStatus({ kind: 'success', message: 'Nombre actualizado.' });
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Perfil</h3>
      </div>

      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-800">
        {shownImage ? (
          <img src={shownImage} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg font-semibold">
            {initialsOf(user.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-1">Foto de perfil</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFile}
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
            {shownImage && (
              <button
                type="button"
                disabled={avatarStatus.kind === 'loading'}
                onClick={() => setConfirmRemove(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Quitar
              </button>
            )}
          </div>
          {avatarStatus.kind !== 'idle' && avatarStatus.kind !== 'loading' && (
            <div className="mt-2">
              <StatusBanner status={avatarStatus} />
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-1.5">PNG, JPG o WebP · máx. 2MB</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="profile-email" className="block text-xs font-medium text-slate-400 mb-1.5">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={user.email}
            readOnly
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label htmlFor="profile-name" className="block text-xs font-medium text-slate-400 mb-1.5">
            Nombre
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <StatusBanner status={status} />

        <button
          type="submit"
          disabled={status.kind === 'loading' || name.trim() === user.name}
          className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {status.kind === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar cambios
        </button>
      </form>

      {confirmRemove && (
        <ConfirmModal
          title="Quitar foto de perfil"
          message="Se eliminará tu foto y volverás a las iniciales. Si entraste con Google, tu foto de Google no se restaura automáticamente hasta un nuevo inicio de sesión."
          confirmLabel="Quitar foto"
          onConfirm={async () => {
            await onRemove();
            setConfirmRemove(false);
          }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </section>
  );
}

function PasswordBlock() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (next.length < 8) {
      setStatus({ kind: 'error', message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (next !== confirm) {
      setStatus({ kind: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }
    setStatus({ kind: 'loading' });
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: revokeOthers,
    });
    if (error) {
      setStatus({ kind: 'error', message: error.message ?? 'No se pudo cambiar la contraseña.' });
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    setStatus({ kind: 'success', message: 'Contraseña actualizada.' });
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Seguridad</h3>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="pw-current" className="block text-xs font-medium text-slate-400 mb-1.5">
            Contraseña actual
          </label>
          <input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="pw-new" className="block text-xs font-medium text-slate-400 mb-1.5">
            Nueva contraseña
          </label>
          <input
            id="pw-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label htmlFor="pw-confirm" className="block text-xs font-medium text-slate-400 mb-1.5">
            Confirmar nueva contraseña
          </label>
          <input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={revokeOthers}
            onChange={(e) => setRevokeOthers(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950"
          />
          Cerrar sesión en otros dispositivos
        </label>

        <StatusBanner status={status} />

        <button
          type="submit"
          disabled={status.kind === 'loading' || !current || !next || !confirm}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {status.kind === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          Cambiar contraseña
        </button>
      </form>
    </section>
  );
}

function PreferencesBlock() {
  const [clearStatus, setClearStatus] = useState<Status>({ kind: 'idle' });
  const [resetStatus, setResetStatus] = useState<Status>({ kind: 'idle' });

  const onClearFilters = async () => {
    const ok = window.confirm('Esto borrará TODOS tus filtros guardados en todas las secciones. ¿Continuar?');
    if (!ok) return;
    setClearStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/user-preferences', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      clearAllPersistedFiltersLocal();
      setClearStatus({ kind: 'success', message: 'Filtros guardados eliminados. Recarga otras pestañas para verlas en limpio.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setClearStatus({ kind: 'error', message: `No se pudieron borrar: ${message}` });
    }
  };

  const onResetDashboard = () => {
    const ok = window.confirm('Esto restablecerá el layout del Dashboard a sus widgets por defecto. ¿Continuar?');
    if (!ok) return;
    try {
      window.localStorage.removeItem('pn-dashboard-config');
      setResetStatus({ kind: 'success', message: 'Dashboard restablecido. Recarga la página principal para verlo.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResetStatus({ kind: 'error', message });
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Preferencias</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-sm text-slate-200">Filtros guardados</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Borra los filtros y toggles persistidos en todas las secciones (PM, estatus, hito, etc.).
              </p>
            </div>
            <button
              onClick={onClearFilters}
              disabled={clearStatus.kind === 'loading'}
              className="shrink-0 flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-300 text-sm font-medium rounded-lg px-3 py-1.5 border border-red-500/30 transition-colors"
            >
              {clearStatus.kind === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Limpiar todos
            </button>
          </div>
          <StatusBanner status={clearStatus} />
        </div>

        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-sm text-slate-200">Layout del Dashboard</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Restablece los widgets visibles y su orden en la página principal.
              </p>
            </div>
            <button
              onClick={onResetDashboard}
              className="shrink-0 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg px-3 py-1.5 border border-slate-700 transition-colors"
            >
              Restablecer
            </button>
          </div>
          <StatusBanner status={resetStatus} />
        </div>
      </div>
    </section>
  );
}

interface SessionRow {
  id: string;
  token: string;
  createdAt: string | Date;
  expiresAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function parseUserAgent(ua: string | null | undefined): { device: string; isMobile: boolean } {
  if (!ua) return { device: 'Dispositivo desconocido', isMobile: false };
  const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
  let browser = 'Navegador';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  let os = 'OS';
  if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Linux/.test(ua)) os = 'Linux';
  return { device: `${browser} en ${os}`, isMobile };
}

function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const absSec = Math.abs(diffMs) / 1000;
  const future = diffMs < 0;
  if (absSec < 60) return future ? 'en unos segundos' : 'hace unos segundos';
  const min = Math.round(absSec / 60);
  if (min < 60) return future ? `en ${min} min` : `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return future ? `en ${hr} h` : `hace ${hr} h`;
  const days = Math.round(hr / 24);
  return future ? `en ${days} día${days !== 1 ? 's' : ''}` : `hace ${days} día${days !== 1 ? 's' : ''}`;
}

function SessionsBlock({ currentToken }: { currentToken: string | undefined }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeOthersStatus, setRevokeOthersStatus] = useState<Status>({ kind: 'idle' });

  const loadSessions = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await authClient.listSessions();
      const rows = (res?.data ?? []) as unknown as SessionRow[];
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRevoke = async (token: string) => {
    if (token === currentToken) return;
    const ok = window.confirm('¿Cerrar esta sesión? El dispositivo deberá iniciar sesión de nuevo.');
    if (!ok) return;
    setRevoking(token);
    try {
      await authClient.revokeSession({ token });
      setSessions((prev) => (prev ?? []).filter((s) => s.token !== token));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(`No se pudo cerrar la sesión: ${message}`);
    } finally {
      setRevoking(null);
    }
  };

  const onRevokeOthers = async () => {
    const ok = window.confirm('Esto cerrará todas tus sesiones en otros dispositivos. ¿Continuar?');
    if (!ok) return;
    setRevokeOthersStatus({ kind: 'loading' });
    try {
      await authClient.revokeOtherSessions();
      setRevokeOthersStatus({ kind: 'success', message: 'Otras sesiones cerradas.' });
      await loadSessions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRevokeOthersStatus({ kind: 'error', message });
    }
  };

  const otherCount = (sessions ?? []).filter((s) => s.token !== currentToken).length;

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Sesiones activas</h3>
        </div>
        {otherCount > 0 && (
          <button
            onClick={onRevokeOthers}
            disabled={revokeOthersStatus.kind === 'loading'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-300 border border-red-500/30 transition-colors"
          >
            {revokeOthersStatus.kind === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
            Cerrar todas las demás ({otherCount})
          </button>
        )}
      </div>

      {revokeOthersStatus.kind !== 'idle' && (
        <div className="mb-3">
          <StatusBanner status={revokeOthersStatus} />
        </div>
      )}

      {loadError && (
        <div className="mb-3">
          <StatusBanner status={{ kind: 'error', message: loadError }} />
        </div>
      )}

      {sessions === null ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No hay sesiones activas para mostrar.</p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {sessions.map((s) => {
            const { device, isMobile } = parseUserAgent(s.userAgent);
            const isCurrent = s.token === currentToken;
            const Icon = isMobile ? Smartphone : Monitor;
            return (
              <li key={s.id} className="py-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-100">{device}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        Esta sesión
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Iniciada {formatRelative(s.createdAt)} · Expira {formatRelative(s.expiresAt)}
                    {s.ipAddress ? ` · ${s.ipAddress}` : ''}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="text-xs text-slate-600 self-center px-2">Activa</span>
                ) : (
                  <button
                    onClick={() => onRevoke(s.token)}
                    disabled={revoking === s.token}
                    className="shrink-0 self-center flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-red-300 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 disabled:opacity-50 transition-colors"
                  >
                    {revoking === s.token ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <LogOut className="w-3 h-3" />
                    )}
                    Cerrar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface McpTokenSummary {
  tokenPrefix: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number;
}

const MCP_EXPIRES_OPTIONS: { value: 30 | 90 | 180 | 365; label: string }[] = [
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '1 año' },
];

function formatTs(ms: number | null): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(ms: number): number {
  return Math.ceil((ms - Date.now()) / 86_400_000);
}

function McpTokensBlock() {
  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<30 | 90 | 180 | 365>(90);
  const [createStatus, setCreateStatus] = useState<Status>({ kind: 'idle' });
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeFor, setRevokeFor] = useState<McpTokenSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/me/mcp-tokens', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onCreate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateStatus({ kind: 'error', message: 'El nombre es obligatorio.' });
      return;
    }
    setCreateStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/me/mcp-tokens', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, expiresInDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setNewToken(data.token);
      setName('');
      setCreateStatus({ kind: 'idle' });
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCreateStatus({ kind: 'error', message });
    }
  };

  const onConfirmRevoke = async () => {
    if (!revokeFor) return;
    try {
      const res = await fetch(`/api/me/mcp-tokens?prefix=${encodeURIComponent(revokeFor.tokenPrefix)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRevokeFor(null);
      await refresh();
    } catch {
      setRevokeFor(null);
    }
  };

  const onCopy = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Tokens MCP</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Bearer tokens largos para autenticar el servidor MCP (Claude Desktop / Claude Code). Heredan tu rol y permisos — todo lo que veas en la app es lo que verá el MCP. Caducidad máxima 1 año.
      </p>

      {newToken && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-medium mb-0.5">Cópialo ahora — no podrás verlo de nuevo.</p>
              <p className="text-amber-200/80">Pégalo en tu config MCP como <code className="bg-slate-950 px-1 rounded">PN_API_TOKEN</code>.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-cyan-300 break-all">
              {newToken}
            </code>
            <button
              onClick={onCopy}
              className="shrink-0 flex items-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-medium rounded px-2.5 py-1.5 border border-cyan-500/30 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={() => setNewToken(null)}
              className="shrink-0 text-xs text-amber-300/70 hover:text-amber-200 px-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-xs text-slate-500 py-3">Cargando…</div>
      ) : tokens.length === 0 ? (
        <div className="text-xs text-slate-500 py-3 italic">Aún no has emitido tokens MCP.</div>
      ) : (
        <ul className="space-y-2 mb-4">
          {tokens.map((t) => {
            const expired = t.expiresAt <= Date.now();
            const daysLeft = daysUntil(t.expiresAt);
            return (
              <li key={t.tokenPrefix} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200 truncate">{t.name}</span>
                    {expired && (
                      <span className="text-[10px] uppercase tracking-wide bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded">caducado</span>
                    )}
                    {!expired && daysLeft <= 7 && (
                      <span className="text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">caduca en {daysLeft}d</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <code className="font-mono text-slate-400">{t.tokenPrefix}…</code>
                    <span>Creado {formatTs(t.createdAt)}</span>
                    <span>· Último uso {formatTs(t.lastUsedAt)}</span>
                    <span>· Caduca {formatTs(t.expiresAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setRevokeFor(t)}
                  className="shrink-0 flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium rounded px-2 py-1 border border-red-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revocar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Crear nuevo */}
      <form onSubmit={onCreate} className="border-t border-slate-800 pt-4 space-y-3">
        <p className="text-xs font-medium text-slate-300">Nuevo token</p>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre descriptivo (ej. Claude Desktop — MacBook)"
            maxLength={64}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value) as 30 | 90 | 180 | 365)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          >
            {MCP_EXPIRES_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createStatus.kind === 'loading' || !name.trim()}
            className="flex items-center justify-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 text-sm font-medium rounded-lg px-3 py-2 border border-cyan-500/30 transition-colors"
          >
            {createStatus.kind === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Emitir
          </button>
        </div>
        <StatusBanner status={createStatus} />
      </form>

      {revokeFor && (
        <ConfirmModal
          title="Revocar token MCP"
          message={`El token "${revokeFor.name}" dejará de funcionar de inmediato. Cualquier MCP que lo use recibirá 401.`}
          confirmLabel="Revocar"
          tone="danger"
          onConfirm={onConfirmRevoke}
          onCancel={() => setRevokeFor(null)}
        />
      )}
    </section>
  );
}

export default function CuentaSection() {
  const { data: session, isPending } = authClient.useSession();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    authClient
      .listAccounts()
      .then((res) => {
        if (cancelled) return;
        const accounts = (res?.data ?? []) as Array<{ providerId?: string; provider?: string }>;
        const found = accounts.some((a) => (a.providerId ?? a.provider) === 'credential');
        setHasPassword(found);
      })
      .catch(() => {
        if (!cancelled) setHasPassword(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isPending) {
    return (
      <div>
        <Header title="Mi cuenta" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 animate-pulse h-48" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div>
        <Header title="Mi cuenta" />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400">
          No se pudo cargar la sesión. Recarga la página o vuelve a iniciar sesión.
        </div>
      </div>
    );
  }

  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
  const currentToken = (session.session as { token?: string } | undefined)?.token;

  return (
    <div>
      <Header title="Mi cuenta" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        {hasPassword ? (
          <>
            <ProfileBlock user={user} />
            <PasswordBlock />
          </>
        ) : (
          <div className="lg:col-span-2">
            <ProfileBlock user={user} />
          </div>
        )}
        <div className="lg:col-span-2">
          <SessionsBlock currentToken={currentToken} />
        </div>
        <div className="lg:col-span-2">
          <McpTokensBlock />
        </div>
        <div className="lg:col-span-2">
          <PreferencesBlock />
        </div>
      </div>
    </div>
  );
}
