'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type Props = {
  nextPath?: string;
};

export default function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(
          data.error === 'invalid_credentials'
            ? 'Invalid username or password.'
            : `Sign-in failed (${data.error ?? response.status}).`
        );
        return;
      }
      const dest =
        nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/settings/brand';
      router.push(dest);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form">
      <label className="field">
        <span>Username</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="demo or your email"
          required
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </label>
      <button type="submit" className="primary" disabled={loading} aria-busy={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      {message ? (
        <p className="error" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      <p className="hint">
        After seed: username <code>demo</code>, password <code>demo123</code>. New workspace?{' '}
        <Link href="/register">Register</Link>
      </p>
    </form>
  );
}
