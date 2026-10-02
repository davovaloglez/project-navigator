import { useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { translateAuthError } from '../../lib/authErrors';

interface LoginFormProps {
  redirect: string;
}

export default function LoginForm({ redirect }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleEmailSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setLoadingEmail(true);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: redirect,
    });
    setLoadingEmail(false);
    if (signInError) {
      setError(translateAuthError(signInError, 'No se pudo iniciar sesión.'));
      return;
    }
    window.location.href = redirect;
  };

  const handleGoogle = async () => {
    setError(null);
    setLoadingGoogle(true);
    const { error: googleError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirect,
    });
    if (googleError) {
      setError(translateAuthError(googleError, 'No se pudo iniciar sesión con Google.'));
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h2>
      <p className="text-sm text-slate-500 mb-5">Acceso restringido al equipo</p>

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loadingEmail || loadingGoogle}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          {loadingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Entrar
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-800"></div>
        <span className="text-xs text-slate-600 uppercase tracking-wider">o</span>
        <div className="flex-1 h-px bg-slate-800"></div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loadingEmail || loadingGoogle}
        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-sm font-medium rounded-lg px-3 py-2 transition-colors border border-slate-700"
      >
        {loadingGoogle ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
          </svg>
        )}
        Continuar con Google
      </button>
    </div>
  );
}
