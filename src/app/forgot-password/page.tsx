'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'An error occurred. Please try again.');
      } else {
        setSuccess('An OTP verification code has been dispatched.');
        
        // Redirect to OTP verification page after a brief delay
        setTimeout(() => {
          router.push(`/verify-otp?email=${encodeURIComponent(email.toLowerCase().trim())}`);
        }, 1500);
      }
    } catch (err) {
      setError('Network connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Forgot Password</h1>
      <p className="subtitle">Enter your email to receive a 6-digit secure verification OTP</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input
            className="form-input"
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            disabled={loading}
          />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Send OTP Code'}
        </button>
      </form>

      <p className="link-footer">
        Back to{' '}
        <Link className="link-action" href="/login">
          Log In
        </Link>
      </p>
    </div>
  );
}
