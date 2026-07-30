'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [passwordRules, setPasswordRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const [strength, setStrength] = useState(0);

  useEffect(() => {
    const password = formData.password;
    const rules = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    setPasswordRules(rules);

    let count = 0;
    if (rules.length) count++;
    if (rules.uppercase) count++;
    if (rules.lowercase) count++;
    if (rules.number) count++;
    if (rules.special) count++;
    setStrength(count);
  }, [formData.password]);

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
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (strength < 5) {
      newErrors.password = 'Password does not meet complexity requirements';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const parsedErrors: Record<string, string> = {};
          Object.keys(data.errors).forEach((key) => {
            parsedErrors[key] = data.errors[key][0];
          });
          setErrors(parsedErrors);
        } else {
          setApiError(data.message || 'An error occurred during registration.');
        }
      } else {
        setApiSuccess(data.message || 'Signup successful! Please check your email.');
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      setApiError('Network connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (!formData.password) return 'Password Strength';
    if (strength <= 2) return 'Weak password';
    if (strength <= 4) return 'Medium password';
    return 'Strong password';
  };

  const getStrengthColor = (index: number) => {
    if (index >= strength) return 'rgba(255, 255, 255, 0.1)';
    if (strength <= 2) return 'hsl(0, 84%, 60%)';
    if (strength <= 4) return 'hsl(38, 92%, 50%)';
    return 'hsl(142, 70%, 45%)';
  };

  return (
    <div className="auth-card">
      <h1>Create Account</h1>
      <p className="subtitle">Secure and production-grade auth gateway</p>

      {apiError && <div className="alert alert-error">{apiError}</div>}
      {apiSuccess && <div className="alert alert-success">{apiSuccess}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Name</label>
          <input
            className="form-input"
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
            disabled={loading}
          />
          {errors.name && <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>{errors.name}</span>}
        </div>

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
          <label className="form-label" htmlFor="password">Password</label>
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

          <div className="strength-bar-container">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="strength-bar"
                style={{ backgroundColor: getStrengthColor(i) }}
              />
            ))}
          </div>
          <div className="strength-text">{getStrengthLabel()}</div>

          {formData.password && (
            <ul className="criteria-list">
              <li className={`criteria-item ${passwordRules.length ? 'valid' : ''}`}>
                {passwordRules.length ? '✓' : '✗'} Minimum 8 characters
              </li>
              <li className={`criteria-item ${passwordRules.uppercase ? 'valid' : ''}`}>
                {passwordRules.uppercase ? '✓' : '✗'} At least one uppercase letter
              </li>
              <li className={`criteria-item ${passwordRules.lowercase ? 'valid' : ''}`}>
                {passwordRules.lowercase ? '✓' : '✗'} At least one lowercase letter
              </li>
              <li className={`criteria-item ${passwordRules.number ? 'valid' : ''}`}>
                {passwordRules.number ? '✓' : '✗'} At least one number
              </li>
              <li className={`criteria-item ${passwordRules.special ? 'valid' : ''}`}>
                {passwordRules.special ? '✓' : '✗'} At least one special symbol
              </li>
            </ul>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            className="form-input"
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            disabled={loading}
          />
          {errors.confirmPassword && (
            <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>
              {errors.confirmPassword}
            </span>
          )}
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Sign Up'}
        </button>
      </form>

      <p className="link-footer">
        Already have an account?{' '}
        <Link className="link-action" href="/login">
          Log In
        </Link>
      </p>
    </div>
  );
}
