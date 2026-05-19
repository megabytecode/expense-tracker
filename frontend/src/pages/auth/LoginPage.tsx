import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to request OTP');
      }

      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-sm rounded-lg bg-[var(--color-surface-container-lowest)] p-8 shadow-sm border border-[var(--color-outline-variant)]">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-[var(--color-surface-container)] p-3">
            <Mail className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--color-on-surface)]">Welcome back</h2>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)] text-center">
            Enter your email to receive a secure login code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          
          {error && <p className="text-sm text-[var(--color-error)] text-center">{error}</p>}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Continue with Email'}
          </Button>
        </form>
      </div>
    </div>
  );
}
