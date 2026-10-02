import { useEffect, useRef, useState } from 'react';
import { LogOut, Loader2, UserCog } from 'lucide-react';
import { authClient } from '../../lib/authClient';

interface UserMenuProps {
  user: { name: string; email: string; image?: string | null };
  variant?: 'sidebar' | 'inline';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserMenu({ user, variant = 'sidebar' }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    window.location.href = '/login';
  };

  const avatar = user.image ? (
    <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-semibold">
      {initials(user.name)}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="flex flex-col gap-1">
        <a
          href="/cuenta"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <UserCog className="w-4.5 h-4.5" />
          Mi cuenta
        </a>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {signingOut ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <LogOut className="w-4.5 h-4.5" />}
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-2 sidebar-mini:px-0 sidebar-mini:justify-center py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${user.name} (${user.email})`}
      >
        {avatar}
        <div className="flex-1 min-w-0 sidebar-mini:hidden">
          <div className="text-sm font-medium text-slate-100 truncate">{user.name}</div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 sidebar-mini:right-auto sidebar-mini:w-48 mb-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
          <a
            href="/cuenta"
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <UserCog className="w-4 h-4" />
            Mi cuenta
          </a>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 border-t border-slate-800"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
