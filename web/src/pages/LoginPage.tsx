import * as React from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { CodigoInvalidoError, startLogin, verifyCode } from '@/lib/auth';

type Paso = 'correo' | 'codigo';

export function LoginPage() {
  const { autenticado, marcarAutenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [paso, setPaso] = React.useState<Paso>('correo');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [session, setSession] = React.useState('');
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (autenticado) {
    const desde = (location.state as { desde?: string } | null)?.desde ?? '/panel';
    return <Navigate to={desde} replace />;
  }

  async function enviarCorreo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { session: nuevaSession } = await startLogin(email.trim());
      setSession(nuevaSession);
      setPaso('codigo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código.');
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await verifyCode(email.trim(), code.trim(), session);
      marcarAutenticado();
      const desde = (location.state as { desde?: string } | null)?.desde ?? '/panel';
      navigate(desde, { replace: true });
    } catch (err) {
      if (err instanceof CodigoInvalidoError) {
        if (err.sessionNueva) setSession(err.sessionNueva);
        setError(err.vencido ? 'El código venció. Te enviamos uno nuevo la próxima vez que lo pidas.' : err.message);
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo verificar el código.');
      }
      setCode('');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0d0e11] px-4 py-10 text-[#f7f7f8]">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" className="inline-block size-12 rounded-2xl" style={{ background: 'var(--tmx-brand-gradient)' }} />
          <div>
            <p className="text-lg font-bold tracking-tight">
              TAMIX <span className="tmx-brand-text">MEDIA STUDIO</span>
            </p>
            <p className="mt-1 text-sm text-[#a5a9b3]">El panel de operación de tu publicación en Tamix.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#292b32] bg-[#15161a] p-6 shadow-xl">
          {paso === 'correo' ? (
            <form onSubmit={enviarCorreo} className="space-y-4" aria-label="Iniciar sesión con correo">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#f7f7f8]">
                  Correo de tu cuenta Tamix
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#3a3d46] bg-[#0d0e11] text-[#f7f7f8] placeholder:text-[#7d828d]"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-[#ff6b7d]">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={cargando || !email.trim()} className="w-full">
                {cargando ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Enviar código
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmarCodigo} className="space-y-4" aria-label="Confirmar código de acceso">
              <div className="flex items-start gap-2 rounded-lg border border-[#292b32] bg-[#0d0e11] p-3 text-sm text-[#a5a9b3]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#5533ff]" />
                <p>
                  Enviamos un código de 6 dígitos a <b className="text-[#f7f7f8]">{email}</b>.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-[#f7f7f8]">
                  Código de verificación
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="border-[#3a3d46] bg-[#0d0e11] text-center text-lg tracking-[0.5em] text-[#f7f7f8] placeholder:text-[#7d828d]"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-[#ff6b7d]">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={cargando || code.length !== 6} className="w-full">
                {cargando && <Loader2 className="animate-spin" />}
                Entrar
              </Button>
              <button
                type="button"
                onClick={() => {
                  setPaso('correo');
                  setCode('');
                  setError(null);
                }}
                className="w-full text-center text-sm text-[#a5a9b3] underline-offset-4 hover:underline"
              >
                Usar otro correo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
