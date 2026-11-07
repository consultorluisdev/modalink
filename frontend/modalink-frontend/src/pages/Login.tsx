import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

export interface LoginProps {
  onLogin: (email: string, password: string) => void | Promise<void>;
  onRegister?: () => void;
  onForgotPassword?: () => void;
  loading?: boolean;
  error?: string;
}

export default function Login({
  onLogin,
  onRegister,
  onForgotPassword,
  loading = false,
  error = '',
}: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(email.trim(), password);
  }

  return (
    <main className="min-h-screen bg-[#f3eaff] p-0 text-[#21142b] sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-screen max-w-[1600px] overflow-hidden bg-[#f3eaff] sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[28px] sm:shadow-2xl lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative isolate hidden overflow-hidden bg-[#27052f] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_5%_10%,rgba(169,91,214,0.3),transparent_36%),radial-gradient(ellipse_at_80%_90%,rgba(108,22,138,0.68),transparent_44%),linear-gradient(145deg,#210329_0%,#31063c_54%,#1c0328_100%)]" />
          <div className="absolute -right-28 -top-40 -z-10 h-[430px] w-[430px] rounded-full border border-fuchsia-100/15" />
          <div className="absolute -right-12 -top-24 -z-10 h-[300px] w-[300px] rounded-full border border-fuchsia-100/15" />
          <div className="absolute -bottom-24 -left-20 -z-10 h-72 w-[125%] rotate-[-10deg] rounded-[50%] bg-gradient-to-r from-fuchsia-400/10 via-violet-300/20 to-transparent blur-2xl" />

          <a
            href="/"
            className="inline-flex w-fit items-center gap-3 text-xl font-semibold tracking-tight text-white"
          >
            <BrandMark /> ModaLink
          </a>

          <div className="relative max-w-2xl py-12">
            <div className="mb-7 h-1.5 w-20 rounded-full bg-[#d9a9ff]" />
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-7xl">
              Seu estilo.
              <br />
              Seu negócio.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-8 text-violet-100/80 xl:text-xl">
              Tudo o que sua loja precisa, em um só lugar.
            </p>
            <FashionSketch />
          </div>

          <p className="text-xs tracking-wide text-violet-100/50">MODALINK · GESTÃO PARA MODA</p>
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:min-h-0 sm:px-10 lg:px-12 xl:px-20">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/60 blur-3xl lg:hidden" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl lg:hidden" />

          <div className="relative w-full max-w-[490px] rounded-[28px] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(55,20,72,0.14)] sm:px-10 sm:py-10 xl:px-12">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[19px] bg-gradient-to-br from-[#7426e8] to-[#4d16c6] shadow-lg shadow-violet-500/25">
                <Lightning className="h-8 w-8 text-white" />
              </div>
              <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[#271331]">ModaLink</p>
              <p className="mt-1.5 text-sm text-[#7a6a83]">Acesse sua conta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#382640]">Email</span>
                <span className="flex h-14 items-center gap-3 rounded-xl border border-[#e1dbe7] bg-white px-4 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                  <Mail size={18} className="shrink-0 text-[#9b8da3]" />
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#2c1b35] outline-none placeholder:text-[#a89dac]"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#382640]">Senha</span>
                <span className="flex h-14 items-center gap-3 rounded-xl border border-[#e1dbe7] bg-white px-4 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                  <LockKeyhole size={18} className="shrink-0 text-[#9b8da3]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#2c1b35] outline-none placeholder:text-[#a89dac]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="rounded-md p-1 text-[#9b8da3] transition hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-semibold text-[#6d24d5] transition hover:text-[#4d16a8]"
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#6f24db] to-[#5314c4] px-5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:from-[#5d1cc7] hover:to-[#4710ae] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#76677e]">
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={onRegister}
                className="font-bold text-[#6d24d5] hover:text-[#4d16a8]"
              >
                Registre-se
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
      <Lightning className="h-5 w-5 text-white" />
    </span>
  );
}

function Lightning({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13.2 2.8 5.8 13h5.1l-.7 8.2L18.2 10h-5.1l.1-7.2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function FashionSketch() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 280 420"
      className="pointer-events-none absolute -right-6 -top-24 hidden h-[430px] w-[285px] opacity-70 xl:block"
    >
      <path
        d="M111 46c13-17 35-23 57-12 20 10 28 27 28 46-1 24-15 42-28 54"
        fill="none"
        stroke="#e5bdff"
        strokeWidth="2"
      />
      <path
        d="M114 55c-19-18-41-10-47 8-7 20 13 33 31 42 7 4 13 10 16 17 6 15 5 27-2 39-8 13-22 24-33 35-17 17-23 34-19 54 2 13 10 24 23 32l45 26 30 89 92-7-42-94c-4-9-5-18-2-27 7-25 13-49 13-73 0-43-17-78-49-100"
        fill="none"
        stroke="#e5bdff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M107 158c20 15 43 17 69 4m-77 121 35-24 53 7 27-20m-87 26 34 95m-34-95 69 3m-35-7 32 99m-67-3 72-6"
        fill="none"
        stroke="#c88df2"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="69" cy="53" r="2" fill="#f4dcff" />
      <circle cx="210" cy="68" r="2" fill="#f4dcff" />
      <circle cx="234" cy="125" r="1.5" fill="#f4dcff" />
    </svg>
  );
}
