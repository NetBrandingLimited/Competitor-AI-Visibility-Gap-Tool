'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, organizationName: organizationName.trim() || undefined })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        if (data.error === 'email_in_use') {
          setMessage('That email is already registered. Sign in instead.');
        } else if (data.error === 'password_too_short') {
          setMessage('Use a password of at least 8 characters.');
        } else if (data.error === 'invalid_email') {
          setMessage('Enter a valid email address.');
        } else {
          setMessage(`Registration failed (${data.error ?? response.status}).`);
        }
        return;
      }
      router.push('/settings/brand');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form">
      <label className="field">
        <span>Work email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </label>
      <label className="field">
        <span>Organization name</span>
        <input
          type="text"
          name="organizationName"
          autoComplete="organization"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="e.g. Acme Inc (optional)"
        />
      </label>
      <button type="submit" className="primary" disabled={loading} aria-busy={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      {message ? <p className="error">{message}</p> : null}
      <p className="hint">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
