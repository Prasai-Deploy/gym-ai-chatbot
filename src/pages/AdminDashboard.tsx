import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Plus, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface AllowedUser {
  id: number;
  email: string;
  created_at: string;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllowedUsers();
  }, []);

  const fetchAllowedUsers = async () => {
    try {
      const res = await fetch('/api/admin/allowed-users');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Access Denied');
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setAllowedUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setError(null);
      const res = await fetch('/api/admin/allowed-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add user');
      }
      const newUser = await res.json();
      setAllowedUsers([newUser, ...allowedUsers]);
      setNewEmail('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to revoke access for this email?')) return;
    
    try {
      setError(null);
      const res = await fetch(`/api/admin/allowed-users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove user');
      setAllowedUsers(allowedUsers.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user || !(user as any).is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 bg-zinc-900/80 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <Shield className="text-emerald-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Admin Dashboard</h1>
            <p className="text-zinc-400 text-sm font-medium mt-1">Manage platform access and whitelisted users.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={20} />
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Add Form */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserCheck className="text-blue-400" size={20} />
                Whitelist Email
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                >
                  <Plus size={18} />
                  Grant Access
                </button>
              </form>
            </div>
          </div>

          {/* Users List */}
          <div className="md:col-span-2">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Allowed Users</h2>
                <span className="text-xs font-black bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                  {allowedUsers.length} Users
                </span>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : allowedUsers.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm font-medium">
                  No users found in the whitelist.
                </div>
              ) : (
                <div className="space-y-3">
                  {allowedUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="truncate pr-4">
                        <p className="font-bold text-sm text-zinc-200 truncate">{u.email}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-1">
                          Added {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(u.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Revoke Access"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
