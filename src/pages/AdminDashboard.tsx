import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Users, Bell, BadgeCheck as IdBadge, Dumbbell as Barbell, 
  Apple, UserCheck, BarChart, ShieldAlert as ShieldLock, Settings, 
  AlertTriangle 
} from 'lucide-react';

const AVATAR_COLORS = ['#1D9E75', '#534AB7', '#D85A30', '#378ADD', '#E24B4A', '#BA7517'];

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState({ totalMembers: 0, activeCount: 0, expiringCount: 0, ptCount: 0 });
  const [renewals, setRenewals] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean, memberId: number | null }>({ isOpen: false, memberId: null });
  const [templates, setTemplates] = useState({ workoutPlans: [], dietPlans: [] });
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [selectedPlanType, setSelectedPlanType] = useState<'workout' | 'diet'>('workout');

  const fetchDashboardData = async () => {
    try {
      // Stats
      const { count: totalMembers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: activeCount } = await supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('status', 'active');
      
      const today = new Date().toISOString().split('T')[0];
      const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { count: expiringCount } = await supabase.from('memberships').select('*', { count: 'exact', head: true })
        .gte('expiry_date', today).lte('expiry_date', in7days);

      const { count: ptCount } = await supabase.from('memberships')
        .select('*, membership_plans!inner(name)', { count: 'exact', head: true })
        .eq('membership_plans.name', 'Personal Training');

      setStats({ totalMembers: totalMembers || 0, activeCount: activeCount || 0, expiringCount: expiringCount || 0, ptCount: ptCount || 0 });

      // Renewals
      const { data: renewalsData } = await supabase.from('memberships')
        .select(`
          id, expiry_date, status, admission_date,
          users (id, name, email),
          membership_plans (name)
        `)
        .lte('expiry_date', in7days)
        .order('expiry_date', { ascending: true })
        .limit(10);
      setRenewals(renewalsData || []);

      // Members Table
      const { data: membersData } = await supabase.from('memberships')
        .select(`
          id, admission_date, expiry_date, status,
          users (id, name, email),
          membership_plans (id, name),
          user_workout_assignments (id, active),
          user_diet_assignments (id, active)
        `)
        .order('admission_date', { ascending: false });
      setMembers(membersData || []);

      // Assignments (left join logic - we'll just fetch latest 5-10 assignments for the Right Card)
      const { data: wAssign } = await supabase.from('user_workout_assignments').select('id, user_id, active, plan_id, users(name), template_workout_plans(name, tier)').order('id', { ascending: false }).limit(5);
      const { data: dAssign } = await supabase.from('user_diet_assignments').select('id, user_id, active, plan_id, users(name), template_diet_plans(name, tier)').order('id', { ascending: false }).limit(5);
      
      const combinedAssignments = [
        ...(wAssign || []).map(a => ({ ...a, type: 'workout', plan: a.template_workout_plans })),
        ...(dAssign || []).map(a => ({ ...a, type: 'diet', plan: a.template_diet_plans }))
      ].sort((a, b) => b.id - a.id).slice(0, 8);
      
      setAssignments(combinedAssignments);

      // Templates for assignment modal
      const { data: wPlans } = await supabase.from('template_workout_plans').select('*');
      const { data: dPlans } = await supabase.from('template_diet_plans').select('*');
      setTemplates({ workoutPlans: wPlans || [], dietPlans: dPlans || [] });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchDashboardData();

    // Real-time Subscriptions
    const sub = supabase.channel('memberships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_workout_assignments' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_diet_assignments' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [authLoading]);

  // Handle plan assignment
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
      setAssignModal({ isOpen: false, memberId: null });
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Auth protection
  if (authLoading) return <div className="h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!(user as any).is_admin) return <Navigate to="/dashboard" replace />;

  const ownerInitials = user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';
  
  const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
  
  const calculateProgress = (admission: string, expiry: string) => {
    const start = new Date(admission).getTime();
    const end = new Date(expiry).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const dueSoonCount = renewals.filter(r => r.status === 'due_soon').length;
  const expiredCount = renewals.filter(r => r.status === 'expired').length;

  const filteredMembers = members.filter(m => {
    if (filter === 'Active') return m.status === 'active';
    if (filter === 'Due soon') return m.status === 'due_soon';
    if (filter === 'Expired') return m.status === 'expired';
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-[13px] text-gray-900 overflow-hidden">
      
      {/* TOP NAVBAR */}
      <nav className="fixed top-0 left-0 w-full h-14 bg-white border-b-[0.5px] border-gray-200 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="font-bold text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75]"></span>
            Sweatfix AI
          </div>
          <span className="bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Gym owner
          </span>
        </div>
        <div className="flex items-center gap-4">
          {dueSoonCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAEEDA] text-[#633806] px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#FAEEDA]">
              <Bell size={14} />
              {dueSoonCount} renewals due
            </div>
          )}
          {expiredCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FCEBEB] text-[#A32D2D] px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#FCEBEB]">
              <AlertTriangle size={14} />
              {expiredCount} expired
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {ownerInitials}
          </div>
        </div>
      </nav>

      {/* LEFT SIDEBAR */}
      <aside className="fixed top-14 left-0 w-[190px] h-[calc(100vh-56px)] bg-white border-r-[0.5px] border-gray-200 overflow-y-auto flex flex-col justify-between pb-4 z-40">
        <div className="py-4">
          
          <div className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overview</div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#E1F5EE] border-l-[3px] border-[#1D9E75] text-[#1D9E75] font-semibold cursor-pointer">
            <LayoutDashboard size={16} />
            Dashboard
          </div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer justify-between">
            <div className="flex items-center gap-2"><Users size={16} /> All members</div>
            <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 rounded-full font-bold">{stats.totalMembers}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer justify-between">
            <div className="flex items-center gap-2"><Bell size={16} /> Renewals</div>
            {(dueSoonCount > 0 || expiredCount > 0) && (
              <span className="bg-[#FAEEDA] text-[#633806] text-[10px] px-1.5 rounded-full font-bold">{dueSoonCount + expiredCount}</span>
            )}
          </div>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plans</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><IdBadge size={16} /> Memberships</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><Barbell size={16} /> Workout plans</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><Apple size={16} /> Diet plans</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><UserCheck size={16} /> Personal training</div>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><Users size={16} /> Trainers</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><BarChart size={16} /> Reports</div>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">System</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><ShieldLock size={16} /> Admin access</div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 cursor-pointer"><Settings size={16} /> Settings</div>

        </div>

        <div className="px-4 pt-4 border-t-[0.5px] border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {ownerInitials}
          </div>
          <div>
            <div className="font-bold text-xs truncate max-w-[120px]">{user.name}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Super admin</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-[190px] mt-14 w-[calc(100%-190px)] h-[calc(100vh-56px)] overflow-y-auto p-6 bg-gray-50 space-y-6">
        
        {/* SECTION 1: Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total members</div>
            <div className="text-[22px] font-black text-gray-900">{stats.totalMembers}</div>
            <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">Active community</div>
          </div>
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Active memberships</div>
            <div className="text-[22px] font-black text-gray-900">{stats.activeCount}</div>
            <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">Current recurring</div>
          </div>
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Expiring (7 days)</div>
            <div className="text-[22px] font-black text-gray-900">{stats.expiringCount}</div>
            <div className="text-[11px] text-[#A32D2D] font-semibold mt-1">Requires attention</div>
          </div>
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">PT Clients</div>
            <div className="text-[22px] font-black text-gray-900">{stats.ptCount}</div>
            <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">Premium tier</div>
          </div>
        </div>

        {/* SECTION 2: Renewals & Assignments */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Card: Renewals */}
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm flex flex-col">
            <div className="p-4 border-b-[0.5px] border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <AlertTriangle size={16} className="text-[#A32D2D]" /> Renewal alerts
              </div>
              <button className="text-[11px] font-bold text-[#1D9E75] hover:underline">View all</button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {renewals.length === 0 ? (
                <div className="text-gray-400 text-xs italic text-center py-6">No renewals coming up.</div>
              ) : (
                renewals.map(r => {
                  const daysLeft = Math.ceil((new Date(r.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  const isExpired = r.status === 'expired' || daysLeft < 0;
                  const dayColor = isExpired ? 'text-[#A32D2D]' : daysLeft <= 3 ? 'text-[#633806]' : 'text-gray-500';
                  
                  return (
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: getAvatarColor(r.users?.id) }}
                        >
                          {getInitials(r.users?.name)}
                        </div>
                        <div>
                          <div className="font-bold text-[12px] text-gray-900">{r.users?.name || r.users?.email}</div>
                          <div className="text-[11px] text-gray-500">{r.membership_plans?.name} • Expires {new Date(r.expiry_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isExpired ? (
                          <span className="bg-[#FCEBEB] text-[#A32D2D] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>
                        ) : (
                          <span className={`text-[11px] font-bold ${dayColor}`}>{daysLeft} days left</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Card: Assignments */}
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm flex flex-col">
            <div className="p-4 border-b-[0.5px] border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <UserCheck size={16} className="text-[#534AB7]" /> Plan assignments
              </div>
              <button 
                onClick={() => setAssignModal({ isOpen: true, memberId: members[0]?.users?.id || null })}
                className="text-[11px] font-bold text-white bg-[#534AB7] px-3 py-1.5 rounded-md hover:bg-opacity-90"
              >
                Assign new
              </button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {assignments.length === 0 ? (
                <div className="text-gray-400 text-xs italic text-center py-6">No recent assignments.</div>
              ) : (
                assignments.map(a => (
                  <div key={`${a.type}-${a.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white shrink-0 ${a.type === 'workout' ? 'bg-[#534AB7]' : 'bg-[#1D9E75]'}`}>
                        {a.type === 'workout' ? <Barbell size={16} /> : <Apple size={16} />}
                      </div>
                      <div>
                        <div className="font-bold text-[12px] text-gray-900">{a.users?.name}</div>
                        <div className="text-[11px] text-gray-500">{a.plan?.name}</div>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${a.plan?.tier === 'Premium' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#F1EFE8] text-[#444441]'}`}>
                        {a.plan?.tier || 'Basic'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Member Tracker Table */}
        <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b-[0.5px] border-gray-200 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
              <IdBadge size={16} className="text-[#1D9E75]" /> Member membership tracker
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg border-[0.5px] border-gray-200">
                {['All', 'Active', 'Due soon', 'Expired'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button className="text-[11px] font-bold text-gray-600 bg-white border-[0.5px] border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50">
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-[0.5px] border-gray-200 bg-gray-50/50">
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Member</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Plan</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Admission</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Expiry</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Duration</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Workout</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Diet</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m: any) => {
                  const pct = calculateProgress(m.admission_date, m.expiry_date);
                  const progressColor = pct >= 100 ? 'bg-[#A32D2D]' : pct >= 80 ? 'bg-[#D85A30]' : 'bg-[#1D9E75]';
                  
                  const hasWorkout = m.user_workout_assignments?.some((a: any) => a.active);
                  const hasDiet = m.user_diet_assignments?.some((a: any) => a.active);

                  const statusBadgeClass = 
                    m.status === 'active' ? 'bg-[#E1F5EE] text-[#0F6E56]' :
                    m.status === 'due_soon' ? 'bg-[#FAEEDA] text-[#633806]' :
                    'bg-[#FCEBEB] text-[#A32D2D]';

                  const planBadgeClass = 
                    m.membership_plans?.name === 'Personal Training' ? 'bg-[#EEEDFE] text-[#3C3489]' :
                    m.membership_plans?.name === 'Premium' ? 'bg-[#E6F1FB] text-[#0C447C]' :
                    'bg-[#F1EFE8] text-[#444441]';

                  return (
                    <tr key={m.id} className="border-b-[0.5px] border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: getAvatarColor(m.users?.id) }}
                          >
                            {getInitials(m.users?.name)}
                          </div>
                          <div>
                            <div className="font-bold text-[12px] text-gray-900">{m.users?.name}</div>
                            <div className="text-[11px] text-gray-500">{m.users?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${planBadgeClass}`}>
                          {m.membership_plans?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="p-3 text-[12px] text-gray-600">{new Date(m.admission_date).toLocaleDateString()}</td>
                      <td className="p-3 text-[12px] text-gray-600">{new Date(m.expiry_date).toLocaleDateString()}</td>
                      <td className="p-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${progressColor}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                          </div>
                          <span className="text-[10px] text-gray-500 font-semibold w-6">{Math.min(pct, 100)}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {hasWorkout ? 
                          <span className="text-[11px] font-bold text-[#1D9E75]">Assigned</span> : 
                          <span className="text-[11px] text-gray-400">None</span>
                        }
                      </td>
                      <td className="p-3">
                        {hasDiet ? 
                          <span className="text-[11px] font-bold text-[#1D9E75]">Yes</span> : 
                          <span className="text-[11px] text-[#A32D2D] font-bold">No</span>
                        }
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${statusBadgeClass}`}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ASSIGN MODAL */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Assign Plan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Member</label>
                <select
                  value={assignModal.memberId || ''}
                  onChange={(e) => setAssignModal({ ...assignModal, memberId: Number(e.target.value) })}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                >
                  <option value="">Select a member...</option>
                  {members.map(m => (
                    <option key={m.users?.id} value={m.users?.id}>{m.users?.name} ({m.membership_plans?.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Plan Type</label>
                <select
                  value={selectedPlanType}
                  onChange={(e: any) => setSelectedPlanType(e.target.value)}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                >
                  <option value="workout">Workout Plan</option>
                  <option value="diet">Diet Plan</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Template</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                >
                  <option value="">Choose a template...</option>
                  {(selectedPlanType === 'workout' ? templates.workoutPlans : templates.dietPlans).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.tier})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setAssignModal({ isOpen: false, memberId: null })}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-[12px] py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!selectedPlanId || !assignModal.memberId}
                className="flex-1 bg-[#1D9E75] hover:bg-[#158260] text-white font-bold text-[12px] py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Assign Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
