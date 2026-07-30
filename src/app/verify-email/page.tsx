'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing from the URL.');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Invalid or expired email verification link.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="auth-card">
      <h1>Email Verification</h1>
      <p className="subtitle">Secure Verification Gateway</p>

      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="alert alert-success" style={{ margin: 0 }}>
          {message}
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            {message}
          </div>
          <Link className="btn-primary" href="/signup" style={{ textDecoration: 'none' }}>
            Go to Signup
          </Link>
        </div>
      )}

      {status !== 'loading' && (
        <p className="link-footer">
          Back to{' '}
          <Link className="link-action" href="/login">
            Log In
          </Link>
        </p>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="spinner" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
