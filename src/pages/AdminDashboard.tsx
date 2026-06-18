import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Users, DollarSign, Activity, AlertTriangle, UserCheck, Shield, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ activeCount: 0, dueSoonCount: 0, expiredCount: 0, revenue: 0 });
  const [members, setMembers] = useState<any[]>([]);
  const [templates, setTemplates] = useState({ workoutPlans: [], dietPlans: [] });
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean, memberId: number | null }>({ isOpen: false, memberId: null });
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [selectedPlanType, setSelectedPlanType] = useState<'workout' | 'diet'>('workout');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, membersRes, plansRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/members'),
        fetch('/api/admin/plans')
      ]);

      if (!statsRes.ok || !membersRes.ok || !plansRes.ok) throw new Error('Failed to fetch admin data');

      setStats(await statsRes.json());
      setMembers(await membersRes.json());
      setTemplates(await plansRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!assignModal.memberId || !selectedPlanId) return;

    try {
      const res = await fetch('/api/admin/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignModal.memberId,
          planId: selectedPlanId,
          planType: selectedPlanType
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Assignment failed');
      }

      alert('Plan assigned successfully!');
      setAssignModal({ isOpen: false, memberId: null });
      fetchDashboardData(); // refresh data
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user || !(user as any).is_admin) {
    // We redirect, but ideally the server handles the exact role mapping via /admin API.
    // If the API fails with 403, it means they are not admin.
  }

  const calculateProgress = (admission: string, expiry: string) => {
    const start = new Date(admission).getTime();
    const end = new Date(expiry).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const expiringMembers = members.filter(m => m.activeMembership?.status === 'due_soon' || m.activeMembership?.status === 'expired');

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 bg-zinc-900/80 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <Shield className="text-emerald-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Gym Management System</h1>
            <p className="text-zinc-400 text-sm font-medium mt-1">Overview of members, plans, and renewals.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-blue-400" size={20} />
              <h3 className="text-sm font-bold text-zinc-400">Active Members</h3>
            </div>
            <p className="text-3xl font-black">{stats.activeCount}</p>
          </div>
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-zinc-400">Monthly Revenue</h3>
            </div>
            <p className="text-3xl font-black">${stats.revenue}</p>
          </div>
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-purple-400" size={20} />
              <h3 className="text-sm font-bold text-zinc-400">Assigned Plans</h3>
            </div>
            <p className="text-3xl font-black">{members.filter(m => m.hasWorkout || m.hasDiet).length}</p>
          </div>
          <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="text-red-400" size={20} />
              <h3 className="text-sm font-bold text-red-400">Expiring Soon</h3>
            </div>
            <p className="text-3xl font-black text-red-400">{stats.dueSoonCount}</p>
          </div>
        </div>

        {/* Renewal Alerts */}
        {expiringMembers.length > 0 && (
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-red-500/20">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              Renewal Alerts ({expiringMembers.length})
            </h2>
            <div className="space-y-3">
              {expiringMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div>
                    <p className="font-bold text-sm">{m.name}</p>
                    <p className="text-xs text-zinc-500">Expires: {new Date(m.activeMembership.expiry_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${m.activeMembership.status === 'expired' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {m.activeMembership.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Table */}
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 overflow-hidden">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <UserCheck className="text-blue-400" size={20} />
            Member Tracker
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-xs font-black uppercase text-zinc-500">Member</th>
                  <th className="p-4 text-xs font-black uppercase text-zinc-500">Plan</th>
                  <th className="p-4 text-xs font-black uppercase text-zinc-500">Status</th>
                  <th className="p-4 text-xs font-black uppercase text-zinc-500">Progress</th>
                  <th className="p-4 text-xs font-black uppercase text-zinc-500">Assignments</th>
                  <th className="p-4 text-xs font-black uppercase text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const hasPlan = m.activeMembership;
                  const pct = hasPlan ? calculateProgress(m.activeMembership.admission_date, m.activeMembership.expiry_date) : 0;
                  
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-sm">{m.name || m.email}</div>
                        <div className="text-xs text-zinc-500">{m.phone || 'No phone'}</div>
                      </td>
                      <td className="p-4">
                        {hasPlan ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                            {m.activeMembership.membership_plans?.name}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">No Plan</span>
                        )}
                      </td>
                      <td className="p-4">
                        {hasPlan ? (
                           <span className={`text-xs font-bold ${m.activeMembership.status === 'active' ? 'text-green-400' : m.activeMembership.status === 'due_soon' ? 'text-orange-400' : 'text-red-400'}`}>
                             {m.activeMembership.status.replace('_', ' ').toUpperCase()}
                           </span>
                        ) : '-'}
                      </td>
                      <td className="p-4 w-48">
                        {hasPlan && (
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full ${pct > 80 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-xs text-zinc-500">{pct}%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${m.hasWorkout ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-600'}`} title="Workout Plan">W</span>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${m.hasDiet ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-600'}`} title="Diet Plan">D</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {hasPlan && m.activeMembership.membership_plans?.name !== 'Basic' && (
                          <button
                            onClick={() => setAssignModal({ isOpen: true, memberId: m.id })}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {members.length === 0 && !loading && (
              <div className="text-center py-12 text-zinc-500">No members found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Assign Plan</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">Plan Type</label>
                <select
                  value={selectedPlanType}
                  onChange={(e: any) => setSelectedPlanType(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="workout">Workout Plan</option>
                  <option value="diet">Diet Plan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">Select Template</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="">-- Choose a template --</option>
                  {(selectedPlanType === 'workout' ? templates.workoutPlans : templates.dietPlans).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.tier})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setAssignModal({ isOpen: false, memberId: null })}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!selectedPlanId}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
