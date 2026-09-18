'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface FieldErrors { email?: string[]; password?: string[]; }

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && typeof data.error === 'object') setErrors(data.error);
        else setServerError(data.error || 'Terjadi kesalahan');
        return;
      }
      if (data.user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setServerError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--color-paper)' }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-[6px] flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx=".75" fill="white"/>
              <rect x="2" y="7.25" width="8" height="1.5" rx=".75" fill="white" opacity=".7"/>
              <rect x="2" y="10.5" width="10" height="1.5" rx=".75" fill="white" opacity=".5"/>
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-ink-900)' }}>Tasker</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-ink-500)' }}>Tracking tugas tim, simpel dan terlacak.</p>
      </div>

      {/* Login card */}
      <div
        className="w-full max-w-sm bg-white shadow-lg"
        style={{ borderRadius: '2px', border: '1px solid #e8e8e8', borderTop: '4px solid var(--color-brand)' }}
      >
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono tracking-widest" style={{ color: 'var(--color-ink-300)' }}>BOARDING PASS</span>
            <span className="text-[10px] font-mono tracking-widest" style={{ color: 'var(--color-ink-300)' }}>TASKER v1</span>
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-ink-900)' }}>Masuk ke Tasker</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-500)' }}>Masukkan email dan password kamu.</p>
        </div>

        <div className="ticket-perf mx-6" />

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-700)' }} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
              placeholder="nama@perusahaan.com"
              className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-all"
              style={{ border: `1px solid ${errors.email ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7', color: 'var(--color-ink-900)' }}
              onFocus={e => { if (!errors.email) e.target.style.borderColor = '#4f3ff0'; e.target.style.background = '#fff'; }}
              onBlur={e => { if (!errors.email) e.target.style.borderColor = '#e8e8e8'; e.target.style.background = '#faf9f7'; }}
            />
            {errors.email && <p className="mt-1 text-xs text-[#ef4444]">{errors.email[0]}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-700)' }} htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-[6px] outline-none transition-all"
                style={{ border: `1px solid ${errors.password ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7', color: 'var(--color-ink-900)' }}
                onFocus={e => { if (!errors.password) e.target.style.borderColor = '#4f3ff0'; e.target.style.background = '#fff'; }}
                onBlur={e => { if (!errors.password) e.target.style.borderColor = '#e8e8e8'; e.target.style.background = '#faf9f7'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#5c5c5c] transition-colors"
                tabIndex={-1}
                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-[#ef4444]">{errors.password[0]}</p>}
          </div>

          {serverError && (
            <div className="px-3 py-2.5 rounded-[6px] text-xs text-[#ef4444]" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-semibold rounded-[6px] transition-all mt-1"
            style={{ background: loading ? '#a0a0a0' : 'var(--color-brand)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" strokeDasharray="8 6" />
                </svg>
                Masuk...
              </span>
            ) : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
