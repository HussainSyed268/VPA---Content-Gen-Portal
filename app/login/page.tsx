'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Sign-in failed');
        return;
      }
      const from = searchParams.get('from');
      router.replace(from && from.startsWith('/') ? from : '/');
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="toothGrad" x1="0" y1="0" x2="1" y2="0.15">
            <stop offset="0" stopColor="#1E5AAE" />
            <stop offset="0.5" stopColor="#3B7BD0" />
            <stop offset="0.62" stopColor="#8B949C" />
            <stop offset="1" stopColor="#C7CDD3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="mark">
            <svg className="tooth" width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="url(#toothGrad)"
                d="M32 10 C31 6 28 3 22 3 C11 3 4 10 4 19 C4 27 7 31 9 39 C10.5 45 11 56 15 59 C18 61 20 56 21 50 C22 44 23 40 27 38 C29.5 36.5 34.5 36.5 37 38 C41 40 42 44 43 50 C44 56 46 61 49 59 C53 56 53.5 45 55 39 C57 31 60 27 60 19 C60 10 53 3 42 3 C36 3 33 6 32 10 Z"
              />
              <text className="b" x="32" y="44" fontSize="34" textAnchor="middle">
                B
              </text>
            </svg>
          </div>
          <div>
            <h1>Dr Bob&apos;s Content Engine</h1>
            <p>Sign in to continue</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <button className="btn btn-create auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-shell" />}>
      <LoginForm />
    </Suspense>
  );
}
