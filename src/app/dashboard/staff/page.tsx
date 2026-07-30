'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  isVerified: boolean;
  createdAt: string;
}

interface CallerUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
}

export default function StaffManagementPage() {
  const router = useRouter();
  const [caller, setCaller] = useState<CallerUser | null>(null);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as 'OWNER' | 'MANAGER' | 'CASHIER'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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

  const attemptRefresh = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        window.sessionStorage.setItem('access_token', data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  };

  const loadData = async () => {
    let token = window.sessionStorage.getItem('access_token');
    if (!token) {
      token = await attemptRefresh();
    }

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // 1. Fetch profile to check role
      const profileResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!profileResponse.ok) {
        const newToken = await attemptRefresh();
        if (newToken) {
          loadData();
        } else {
          router.push('/login');
        }
        return;
      }

      const profileData = await profileResponse.json();
      const user = profileData.user;

      if (user.role === 'CASHIER') {
        router.push('/dashboard');
        return;
      }

      setCaller(user);
      setFormData((prev) => ({ ...prev, role: 'CASHIER' }));

      // 2. Fetch staff members
      const usersResponse = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setStaffList(usersData.users);
      } else {
        setApiError('Failed to load staff list.');
      }
    } catch (err) {
      setApiError('Connection error. Failed to retrieve staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    
    if (strength < 5) {
      errors.password = 'Password must satisfy all complexity constraints';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    if (!validateForm()) return;

    setFormLoading(true);

    let token = window.sessionStorage.getItem('access_token');
    if (!token) {
      token = await attemptRefresh();
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const parsedErrors: Record<string, string> = {};
          Object.keys(data.errors).forEach((key) => {
            parsedErrors[key] = data.errors[key][0];
          });
          setFormErrors(parsedErrors);
        } else {
          setApiError(data.message || 'Failed to create staff account.');
        }
      } else {
        setApiSuccess(data.message || 'Staff registered successfully!');
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'CASHIER'
        });
        loadData();
      }
    } catch (err) {
      setApiError('Network request failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'OWNER') return 'badge badge-owner';
    if (role === 'MANAGER') return 'badge badge-manager';
    return 'badge badge-cashier';
  };

  const getStrengthColor = (index: number) => {
    if (index >= strength) return 'rgba(255, 255, 255, 0.1)';
    if (strength <= 2) return 'hsl(0, 84%, 60%)';
    if (strength <= 4) return 'hsl(38, 92%, 50%)';
    return 'hsl(142, 70%, 45%)';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="spinner" style={{ width: 45, height: 45 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Verifying credentials...</p>
      </div>
    );
  }

  if (!caller) return null;

  return (
    <div className="auth-card" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid var(--border-glass)', paddingBottom: 20 }}>
        <div>
          <h1 style={{ textAlign: 'left', fontSize: 24, margin: 0 }}>Staff Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Create accounts and configure POS roles for cashiers and managers
          </p>
        </div>
        <Link href="/dashboard" className="btn-primary" style={{ width: 'auto', padding: '10px 18px', fontSize: 14, textDecoration: 'none' }}>
          Back to Portal
        </Link>
      </div>

      {apiError && <div className="alert alert-error">{apiError}</div>}
      {apiSuccess && <div className="alert alert-success">{apiSuccess}</div>}

      <div className="staff-layout">
        {/* Staff Table */}
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Staff Roster</h2>
          <div className="staff-table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th className="staff-th">Name</th>
                  <th className="staff-th">Email</th>
                  <th className="staff-th">Role</th>
                  <th className="staff-th">Created</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((member) => (
                  <tr key={member.id} className="staff-tr">
                    <td className="staff-td">{member.name}</td>
                    <td className="staff-td" style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                    <td className="staff-td">
                      <span className={getRoleBadgeClass(member.role)}>{member.role}</span>
                    </td>
                    <td className="staff-td" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="staff-td" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No staff accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Staff Form */}
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Register Staff Account</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: 24 }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Jane Smith"
                  disabled={formLoading}
                />
                {formErrors.name && <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="jane@business.com"
                  disabled={formLoading}
                />
                {formErrors.email && <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Temporary Password</label>
                <input
                  className="form-input"
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  disabled={formLoading}
                />
                {formErrors.password && <span className="criteria-item" style={{ color: 'var(--error)', marginTop: 4 }}>{formErrors.password}</span>}
                
                <div className="strength-bar-container">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{ backgroundColor: getStrengthColor(i) }}
                    />
                  ))}
                </div>

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
                <label className="form-label" htmlFor="role">Assign POS Role</label>
                <select
                  className="form-input"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={formLoading || caller.role !== 'OWNER'}
                  style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-glass)' }}
                >
                  <option value="CASHIER">Cashier (Standard Access)</option>
                  {caller.role === 'OWNER' && (
                    <>
                      <option value="MANAGER">Manager (Inventory & Staff)</option>
                      <option value="OWNER">Owner (Full System Access)</option>
                    </>
                  )}
                </select>
                {caller.role === 'MANAGER' && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Managers are restricted to creating Cashier accounts only.
                  </p>
                )}
              </div>

              <button className="btn-primary" type="submit" disabled={formLoading}>
                {formLoading ? <div className="spinner" /> : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
