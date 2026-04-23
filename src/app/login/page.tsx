'use client';

import { useState, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Btn } from '@/components/ui/Btn';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, totp }),
      });

      if (res.ok) {
        router.push('/edit');
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--color-ink3)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    marginBottom: 8,
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px 0',
    background: 'transparent',
    border: '0',
    borderBottom: '1px solid var(--color-rule)',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    color: 'var(--color-ink)',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-paper)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--color-paper)',
          padding: 32,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            color: 'var(--color-ink)',
            marginBottom: 40,
            textAlign: 'center',
          }}
        >
          Memory Lane
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label htmlFor="password" style={labelStyle}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-rule)')}
              required
            />
          </div>

          <div>
            <label htmlFor="totp" style={labelStyle}>
              Authenticator Code
            </label>
            <input
              type="text"
              id="totp"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-rule)')}
              required
            />
          </div>

          {error && (
            <p
              style={{
                color: 'var(--color-accent)',
                fontSize: 13,
                textAlign: 'center',
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <Btn
            type="submit"
            kind="primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', height: 40 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Btn>
        </form>
      </div>
    </div>
  );
}
