import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Invalid OTP';
}

export function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid OTP');
      }

      const data = await res.json();
      setUser(data.user);
      navigate('/');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-sm rounded-lg bg-[var(--color-surface-container-lowest)] p-8 shadow-sm border border-[var(--color-outline-variant)]">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-[var(--color-surface-container)] p-3">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--color-on-surface)]">Check your email</h2>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)] text-center">
            We sent a 6-digit code to <span className="font-medium text-[var(--color-on-surface)]">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="sr-only">Code</label>
            <Input
              id="otp"
              type="text"
              required
              maxLength={6}
              placeholder="000000"
              className="text-center text-xl tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>
          
          {error && <p className="text-sm text-[var(--color-error)] text-center">{error}</p>}
          
          <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>

          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={() => navigate('/login')}
              className="cursor-pointer text-sm text-[var(--color-secondary)] hover:underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
