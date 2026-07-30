'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  isVerified: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  };

  const attemptRefresh = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST'
      });
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

  useEffect(() => {
    const initializeAuth = async () => {
      let token = window.sessionStorage.getItem('access_token');
      
      if (!token) {
        token = await attemptRefresh();
      }

      if (token) {
        const profile = await fetchProfile(token);
        if (profile) {
          setUser(profile);
          setLoading(false);
          return;
        } else {
          // Token expired, attempt rotation
          const newToken = await attemptRefresh();
          if (newToken) {
            const newProfile = await fetchProfile(newToken);
            if (newProfile) {
              setUser(newProfile);
              setLoading(false);
              return;
            }
          }
        }
      }

      // Not authenticated
      window.sessionStorage.removeItem('access_token');
      router.push('/login');
      router.refresh();
    };

    initializeAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.sessionStorage.removeItem('access_token');
      router.push('/login');
      router.refresh();
    }
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'OWNER') return 'badge badge-owner';
    if (role === 'MANAGER') return 'badge badge-manager';
    return 'badge badge-cashier';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="spinner" style={{ width: 45, height: 45 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Securing connection...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="auth-card" style={{ maxWidth: 800 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid var(--border-glass)', paddingBottom: 20 }}>
        <div>
          <h1 style={{ textAlign: 'left', fontSize: 24, margin: 0 }}>Business Control Center</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Logged in as: <strong>{user.name}</strong></span>
            <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="btn-primary" 
          style={{ width: 'auto', padding: '10px 18px', fontSize: 14 }}
        >
          Log Out
        </button>
      </div>

      {/* Conditionally Rendered Content Based on Role */}
      {user.role === 'OWNER' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Owner Console</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Full system controls enabled. You have access to financials, staff operations, and core configuration settings.
          </p>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div>
                <div className="card-title">Financial Reports</div>
                <p className="card-desc">Review gross margins, transactions, sales tax, and business net revenues.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>View Financials</button>
            </div>

            <div className="dashboard-card">
              <div>
                <div className="card-title">Staff Management</div>
                <p className="card-desc">Add owners, register managers, hire cashiers, and view audit reports.</p>
              </div>
              <Link href="/dashboard/staff" className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content', textDecoration: 'none' }}>
                Manage Staff
              </Link>
            </div>

            <div className="dashboard-card">
              <div>
                <div className="card-title">System Settings</div>
                <p className="card-desc">Adjust POS limits, terminal bindings, and delete audit logs.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>Configure POS</button>
            </div>
            
            <div className="dashboard-card">
              <div>
                <div className="card-title">Inventory Controls</div>
                <p className="card-desc">Full access to modify items, manage warehouses, and verify suppliers.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>Manage Stock</button>
            </div>
          </div>
        </div>
      )}

      {user.role === 'MANAGER' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Manager Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Staff management and inventory oversight active. Note: Financial details and system settings are restricted to Owners.
          </p>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div>
                <div className="card-title">Staff Directory</div>
                <p className="card-desc">View and manage Cashier accounts. You can create cashier keys and reset their shifts.</p>
              </div>
              <Link href="/dashboard/staff" className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content', textDecoration: 'none' }}>
                Manage Cashiers
              </Link>
            </div>

            <div className="dashboard-card">
              <div>
                <div className="card-title">Product & Inventory</div>
                <p className="card-desc">Add new products, updates item quantities, and record stock sheets.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>Inventory List</button>
            </div>

            <div className="dashboard-card" style={{ gridColumn: 'span 1' }}>
              <div>
                <div className="card-title">Daily Sales Reports</div>
                <p className="card-desc">Track shift totals, cash drawer settlements, and transactional volumes.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>View Sales Logs</button>
            </div>
          </div>
        </div>
      )}

      {user.role === 'CASHIER' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Cashier Workspace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Shift active. You are authorized to process transactions and view your current shift history.
          </p>

          <div className="dashboard-grid">
            <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
              <div>
                <div className="card-title">New Register Transaction</div>
                <p className="card-desc">Open sale portal to enter item SKUs, handle payments, and print receipts.</p>
              </div>
              <button className="btn-primary" style={{ padding: '12px 20px', fontSize: 14, width: 'fit-content' }}>Open Register</button>
            </div>

            <div className="dashboard-card">
              <div>
                <div className="card-title">My Shift Sales</div>
                <p className="card-desc">Review payments processed during your active session today.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>View Shift History</button>
            </div>

            <div className="dashboard-card">
              <div>
                <div className="card-title">Drawer Summary</div>
                <p className="card-desc">Check starting drawer balances, cash counts, and payouts.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 13, width: 'fit-content' }}>Drawer Log</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: 40, paddingTop: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        POS Control Client v1.0 • Account ID: {user.id} • Session Safe
      </div>
    </div>
  );
}
