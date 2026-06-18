import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
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
  
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [templates, setTemplates] = useState({ workoutPlans: [], dietPlans: [] });
  
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [selectedPlanType, setSelectedPlanType] = useState<'workout' | 'diet'>('workout');
  
  const [loading, setLoading] = useState(true);

  // Auth protection from prompt
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        // We might fall back to useAuth if no session, but keeping prompt structure
        // Actually, if using passport, session is null.
      } else {
        const { data } = await supabase
          .from('admins')
          .select('role')
          .eq('email', session.user.email)
          .single();
        if (!data) window.location.replace('/app');
      }
    };
    checkAdmin();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard-data');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const data = await res.json();
      
      setStats(data.stats);
      setRenewals(data.renewals);
      
      const combinedAssignments = [
        ...(data.workoutAssignments || []).map((a: any) => ({ ...a, type: 'workout', plan: a.template_workout_plans })),
        ...(data.dietAssignments || []).map((a: any) => ({ ...a, type: 'diet', plan: a.template_diet_plans }))
      ].sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()).slice(0, 10);
      setAssignments(combinedAssignments);
      
      setMembers(data.members);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // PRIORITY 7: Real-time Updates
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_workout_assignments' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_diet_assignments' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openAssignModal = async () => {
    setAssignModal({ isOpen: true });
    // Step 1: Select member
    const memRes = await fetch('/api/admin/members');
    if (memRes.ok) {
       const mems = await memRes.json();
       setUsersList(mems || []);
    }
    
    // Step 3: Fetch templates
    const plansRes = await fetch('/api/admin/plans');
    if (plansRes.ok) {
       const pd = await plansRes.json();
       setTemplates({ workoutPlans: pd.workoutPlans || [], dietPlans: pd.dietPlans || [] });
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedMemberId || !selectedPlanId) return;
    try {
      const res = await fetch('/api/admin/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMemberId,
          planId: selectedPlanId,
          planType: selectedPlanType
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Assignment failed');
      }
      setAssignModal({ isOpen: false });
      setSelectedMemberId('');
      setSelectedPlanId('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Auth protection (Passport fallback if they don't have supabase session)
  if (!user && !authLoading) {
    // wait until auth loading is done before redirecting
    window.location.replace('/login');
    return null;
  }
  if (user && !(user as any).is_admin) {
    window.location.replace('/app');
    return null;
  }

  const ownerInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD';
  const getAvatarColor = (id: number) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

  const dueSoonCount = renewals.filter(r => r.status === 'due_soon' || Math.ceil((new Date(r.expiry_date).getTime() - new Date().getTime()) / 86400000) <= 7 && Math.ceil((new Date(r.expiry_date).getTime() - new Date().getTime()) / 86400000) >= 0).length;
  const expiredCount = renewals.filter(r => r.status === 'expired' || Math.ceil((new Date(r.expiry_date).getTime() - new Date().getTime()) / 86400000) < 0).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const in7Str = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];

  const filteredMembers = members.filter(m => {
    if (filter === 'All') return true;
    if (filter === 'Active') return m.status === 'active';
    if (filter === 'Due soon') return m.expiry_date >= todayStr && m.expiry_date <= in7Str;
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
          <Link to="/admin" className="flex items-center gap-2 px-4 py-2 bg-[#E1F5EE] border-l-[3px] border-[#1D9E75] text-[#1D9E75] font-semibold">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link to="/admin/members" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 justify-between">
            <div className="flex items-center gap-2"><Users size={16} /> All members</div>
            <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 rounded-full font-bold">{stats.totalMembers}</span>
          </Link>
          <Link to="/admin/renewals" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 justify-between">
            <div className="flex items-center gap-2"><Bell size={16} /> Renewals</div>
            {(dueSoonCount > 0 || expiredCount > 0) && (
              <span className="bg-[#FAEEDA] text-[#633806] text-[10px] px-1.5 rounded-full font-bold">{dueSoonCount + expiredCount}</span>
            )}
          </Link>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plans</div>
          <Link to="/admin/memberships" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><IdBadge size={16} /> Memberships</Link>
          <Link to="/admin/workout-plans" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><Barbell size={16} /> Workout plans</Link>
          <Link to="/admin/diet-plans" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><Apple size={16} /> Diet plans</Link>
          <Link to="/admin/pt" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><UserCheck size={16} /> Personal training</Link>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff</div>
          <Link to="/admin/trainers" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><Users size={16} /> Trainers</Link>
          <Link to="/admin/reports" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><BarChart size={16} /> Reports</Link>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">System</div>
          <Link to="/admin/access" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><ShieldLock size={16} /> Admin access</Link>
          <Link to="/admin/settings" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600"><Settings size={16} /> Settings</Link>

        </div>

        <div className="px-4 pt-4 border-t-[0.5px] border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {ownerInitials}
          </div>
          <div>
            <div className="font-bold text-xs truncate max-w-[120px]">{user?.name}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Super admin</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-[190px] mt-14 w-[calc(100%-190px)] h-[calc(100vh-56px)] overflow-y-auto p-6 bg-gray-50 space-y-6">
        
        {/* SECTION 1: Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total members</div>
            <div className="text-[22px] font-black text-gray-900">{stats.totalMembers}</div>
            <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">Active community</div>
          </div>
          <div className="bg-gray-50 border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Active memberships</div>
            <div className="text-[22px] font-black text-gray-900">{stats.activeCount}</div>
            <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">Current recurring</div>
          </div>
          <div className="bg-gray-50 border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Expiring (7 days)</div>
            <div className="text-[22px] font-black text-gray-900">{stats.expiringCount}</div>
            <div className="text-[11px] text-[#A32D2D] font-semibold mt-1">Requires attention</div>
          </div>
          <div className="bg-gray-50 border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
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
              {!loading && renewals.length === 0 && (
                <div className="text-gray-400 text-xs italic text-center py-6">No renewals coming up.</div>
              )}
              {loading ? (
                <div className="text-gray-400 text-xs text-center py-6">Loading...</div>
              ) : renewals.map(r => {
                const days = Math.ceil((new Date(r.expiry_date).getTime() - new Date().getTime()) / 86400000);
                
                let dayLabel = <span className="text-[11px] font-bold text-[#1D9E75]">{days} days left</span>;
                if (days < 0) dayLabel = <span className="text-[11px] font-bold text-[#A32D2D]">Expired {Math.abs(days)} days ago</span>;
                else if (days === 0) dayLabel = <span className="text-[11px] font-bold text-[#A32D2D]">Expires today</span>;
                else if (days <= 3) dayLabel = <span className="text-[11px] font-bold text-[#A32D2D]">{days} days left</span>;
                else if (days <= 7) dayLabel = <span className="text-[11px] font-bold text-[#633806]">{days} days left</span>;

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
                      {r.status === 'expired' && days >= 0 ? (
                        <span className="bg-[#FCEBEB] text-[#A32D2D] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>
                      ) : dayLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Card: Assignments */}
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm flex flex-col">
            <div className="p-4 border-b-[0.5px] border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <UserCheck size={16} className="text-[#534AB7]" /> Plan assignments
              </div>
              <button 
                onClick={openAssignModal}
                className="text-[11px] font-bold text-white bg-[#534AB7] px-3 py-1.5 rounded-md hover:bg-opacity-90"
              >
                Assign new
              </button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {!loading && assignments.length === 0 && (
                <div className="text-gray-400 text-xs italic text-center py-6">No recent assignments.</div>
              )}
              {loading ? (
                <div className="text-gray-400 text-xs text-center py-6">Loading...</div>
              ) : assignments.map(a => (
                <div key={`${a.type}-${a.id}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white shrink-0 ${a.type === 'workout' ? 'bg-[#534AB7]' : 'bg-[#1D9E75]'}`}>
                      {a.type === 'workout' ? <Barbell size={16} /> : <Apple size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-[12px] text-gray-900">{a.users?.name}</div>
                      <div className="text-[11px] text-gray-500">{a.plan?.name} • <span className="italic text-[10px]">Assigned by {a.assigned_by_user?.name || 'Admin'}</span></div>
                    </div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${a.plan?.tier === 'Premium' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#F1EFE8] text-[#444441]'}`}>
                      {a.plan?.tier || 'Basic'}
                    </span>
                  </div>
                </div>
              ))}
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
              <button 
                onClick={() => {
                   const csv = "Member,Plan,Admission,Expiry,Status\n" + filteredMembers.map(m => `${m.users?.name},${m.membership_plans?.name},${m.admission_date},${m.expiry_date},${m.status}`).join('\n');
                   const blob = new Blob([csv], { type: 'text/csv' });
                   const url = window.URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.setAttribute('hidden', '');
                   a.setAttribute('href', url);
                   a.setAttribute('download', 'members.csv');
                   document.body.appendChild(a);
                   a.click();
                   document.body.removeChild(a);
                }}
                className="text-[11px] font-bold text-gray-600 bg-white border-[0.5px] border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50"
              >
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
                {!loading && filteredMembers.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs italic">No members found.</td></tr>
                )}
                {loading && filteredMembers.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs">Loading...</td></tr>
                )}
                {filteredMembers.map((m: any) => {
                  const total = new Date(m.expiry_date).getTime() - new Date(m.admission_date).getTime();
                  const elapsed = new Date().getTime() - new Date(m.admission_date).getTime();
                  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
                  
                  const progressColor = pct < 80 ? 'bg-[#1D9E75]' : pct < 100 ? 'bg-[#BA7517]' : 'bg-[#A32D2D]';
                  
                  const hasWorkout = m.user_workout_assignments?.some((a: any) => a.active === true);
                  const hasDiet = m.user_diet_assignments?.some((a: any) => a.active === true);

                  const statusBadgeClass = 
                    m.status === 'active' ? 'bg-[#E1F5EE] text-[#0F6E56]' :
                    m.status === 'due_soon' ? 'bg-[#FAEEDA] text-[#633806]' :
                    'bg-[#FCEBEB] text-[#A32D2D]';

                  const planBadgeClass = 
                    m.membership_plans?.name?.toLowerCase().includes('personal training') ? 'bg-[#EEEDFE] text-[#3C3489]' :
                    m.membership_plans?.name?.toLowerCase().includes('premium') ? 'bg-[#E6F1FB] text-[#0C447C]' :
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
                          <span className="bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Assigned</span> : 
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
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Step 1 — Select Member</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                >
                  <option value="">Search member...</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Step 2 — Select Plan Type</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedPlanType('workout')} 
                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg border-[0.5px] transition-colors ${selectedPlanType === 'workout' ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
                  >
                    Workout Plan
                  </button>
                  <button 
                    onClick={() => setSelectedPlanType('diet')} 
                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg border-[0.5px] transition-colors ${selectedPlanType === 'diet' ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
                  >
                    Diet Plan
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Step 3 — Select Specific Plan</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {(selectedPlanType === 'workout' ? templates.workoutPlans : templates.dietPlans).map((p: any) => (
                    <label key={p.id} className="flex items-center gap-2 text-[12px] p-2 hover:bg-gray-50 rounded-md cursor-pointer border-[0.5px] border-transparent hover:border-gray-200">
                      <input 
                        type="radio" 
                        name="plan_selection" 
                        value={p.id} 
                        checked={selectedPlanId === p.id}
                        onChange={() => setSelectedPlanId(p.id)}
                        className="accent-[#1D9E75]"
                      />
                      <span>{p.name} <span className="text-gray-400 ml-1">({p.tier || 'Basic'})</span></span>
                    </label>
                  ))}
                  {(selectedPlanType === 'workout' ? templates.workoutPlans : templates.dietPlans).length === 0 && (
                    <div className="text-xs text-gray-400 italic">No plans available.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setAssignModal({ isOpen: false })}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-[12px] py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!selectedPlanId || !selectedMemberId}
                className="flex-1 bg-[#1D9E75] hover:bg-[#158260] text-white font-bold text-[12px] py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
