'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.message || 'Invalid credentials');
      } else {
        window.sessionStorage.setItem('access_token', data.accessToken);
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setApiError('Network connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Welcome Back</h1>
      <p className="subtitle">Sign in to your premium dashboard</p>

      {apiError && <div className="alert alert-error">{apiError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input
            className="form-input"
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            disabled={loading}
          />
          {errors.email && <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>{errors.email}</span>}
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <Link className="link-action" style={{ fontSize: 12, marginBottom: 8 }} href="/forgot-password">
              Forgot?
            </Link>
          </div>
          <input
            className="form-input"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            disabled={loading}
          />
          {errors.password && <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>{errors.password}</span>}
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Log In'}
        </button>
      </form>

      <p className="link-footer">
        Don&apos;t have an account?{' '}
        <Link className="link-action" href="/signup">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
