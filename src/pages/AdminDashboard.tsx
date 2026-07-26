import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Users, Bell, BadgeCheck as IdBadge, Dumbbell as Barbell, 
  Apple, UserCheck, BarChart, ShieldAlert as ShieldLock, Settings, 
  AlertTriangle, Menu, X, LogOut
} from 'lucide-react';

import { useAdminDashboardData, useAdminMembers, useAdminPlans, useAdminMembershipPlans, useAssignPlan } from '../hooks/queries/useAdmin';
import { adminApi } from '../api/adminApi';

const AVATAR_COLORS = ['#1D9E75', '#534AB7', '#D85A30', '#378ADD', '#E24B4A', '#BA7517'];

export function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  
  const [filter, setFilter] = useState('All');
  
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [addMemberModal, setAddMemberModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '', planId: '' });
  
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [selectedPlanType, setSelectedPlanType] = useState<'workout' | 'diet'>('workout');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const location = useLocation();
  const currentPath = location.pathname;

  // React Query Hooks
  const { data: dashboardData, isLoading: loading } = useAdminDashboardData();
  const { data: allMembers = [] } = useAdminMembers();
  const { data: plansData } = useAdminPlans();
  const { data: membershipPlansData = [] } = useAdminMembershipPlans();
  const assignPlanMutation = useAssignPlan();

  const stats = dashboardData?.stats || { totalMembers: 0, activeCount: 0, expiringCount: 0, ptCount: 0 };
  const renewals = dashboardData?.renewals || [];
  
  const assignments = [
    ...(dashboardData?.workoutAssignments || []).map((a: any) => ({ ...a, type: 'workout', plan: a.template_workout_plans })),
    ...(dashboardData?.dietAssignments || []).map((a: any) => ({ ...a, type: 'diet', plan: a.template_diet_plans }))
  ].sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()).slice(0, 10);
  
  const members = dashboardData?.members || [];
  const usersList = allMembers || [];
  
  const templates = {
    workoutPlans: plansData?.workoutPlans || [],
    dietPlans: plansData?.dietPlans || [],
    membershipPlans: membershipPlansData || []
  };

  const getSidebarLinkClass = (path: string) => {
    return currentPath === path 
      ? "flex items-center gap-2 px-4 py-2 bg-[#E1F5EE] border-l-[3px] border-[#1D9E75] text-[#1D9E75] font-semibold justify-between"
      : "flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-600 border-l-[3px] border-transparent justify-between";
  };

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

  const openAssignModal = async () => {
    setAssignModal({ isOpen: true });
  };

  const openAddMemberModal = async () => {
    setAddMemberModal({ isOpen: true });
  };

  const handleAssignPlan = async () => {
    if (!selectedMemberId || !selectedPlanId) return;
    try {
      await assignPlanMutation.mutateAsync({
        user_id: String(selectedMemberId),
        plan_id: String(selectedPlanId),
      });
      setAssignModal({ isOpen: false });
      setSelectedMemberId('');
      setSelectedPlanId('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.planId) {
      alert('Please fill out all required fields');
      return;
    }
    try {
      // Stub for add member, will route through adminApi if needed
      setAddMemberModal({ isOpen: false });
      setNewMember({ name: '', email: '', phone: '', planId: '' });
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
      <nav className="fixed top-0 left-0 w-full h-14 bg-white border-b-[0.5px] border-gray-200 z-50 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-1 text-gray-600 hover:bg-gray-100 rounded-md"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="font-bold text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75] hidden sm:block"></span>
            STRIVA
          </div>
          <span className="bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider hidden sm:block">
            Gym owner
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {dueSoonCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAEEDA] text-[#633806] px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-semibold border border-[#FAEEDA]">
              <Bell size={14} />
              <span className="hidden sm:inline">{dueSoonCount} renewals due</span>
              <span className="sm:hidden">{dueSoonCount}</span>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FCEBEB] text-[#A32D2D] px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-semibold border border-[#FCEBEB]">
              <AlertTriangle size={14} />
              <span className="hidden sm:inline">{expiredCount} expired</span>
              <span className="sm:hidden">{expiredCount}</span>
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {ownerInitials}
          </div>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`fixed top-14 left-0 w-[220px] md:w-[190px] h-[calc(100vh-56px)] bg-white border-r-[0.5px] border-gray-200 overflow-y-auto flex flex-col justify-between pb-4 z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="py-4" onClick={() => setIsMobileMenuOpen(false)}>
          
          <div className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overview</div>
          <Link to="/admin" className={getSidebarLinkClass('/admin')}>
            <div className="flex items-center gap-2"><LayoutDashboard size={16} /> Dashboard</div>
          </Link>
          <Link to="/admin/members" className={getSidebarLinkClass('/admin/members')}>
            <div className="flex items-center gap-2"><Users size={16} /> All members</div>
            <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 rounded-full font-bold">{stats.totalMembers}</span>
          </Link>
          <Link to="/admin/renewals" className={getSidebarLinkClass('/admin/renewals')}>
            <div className="flex items-center gap-2"><Bell size={16} /> Renewals</div>
            {(dueSoonCount > 0 || expiredCount > 0) && (
              <span className="bg-[#FAEEDA] text-[#633806] text-[10px] px-1.5 rounded-full font-bold">{dueSoonCount + expiredCount}</span>
            )}
          </Link>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plans</div>
          <Link to="/admin/memberships" className={getSidebarLinkClass('/admin/memberships')}><div className="flex items-center gap-2"><IdBadge size={16} /> Memberships</div></Link>
          <Link to="/admin/workout-plans" className={getSidebarLinkClass('/admin/workout-plans')}><div className="flex items-center gap-2"><Barbell size={16} /> Workout plans</div></Link>
          <Link to="/admin/diet-plans" className={getSidebarLinkClass('/admin/diet-plans')}><div className="flex items-center gap-2"><Apple size={16} /> Diet plans</div></Link>
          <Link to="/admin/pt" className={getSidebarLinkClass('/admin/pt')}><div className="flex items-center gap-2"><UserCheck size={16} /> Personal training</div></Link>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff</div>
          <Link to="/admin/trainers" className={getSidebarLinkClass('/admin/trainers')}><div className="flex items-center gap-2"><Users size={16} /> Trainers</div></Link>
          <Link to="/admin/reports" className={getSidebarLinkClass('/admin/reports')}><div className="flex items-center gap-2"><BarChart size={16} /> Reports</div></Link>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">System</div>
          <Link to="/admin/access" className={getSidebarLinkClass('/admin/access')}><div className="flex items-center gap-2"><ShieldLock size={16} /> Admin access</div></Link>
          <Link to="/admin/settings" className={getSidebarLinkClass('/admin/settings')}><div className="flex items-center gap-2"><Settings size={16} /> Settings</div></Link>

        </div>

        <div className="px-4 pt-4 border-t-[0.5px] border-gray-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {ownerInitials}
            </div>
            <div>
              <div className="font-bold text-xs truncate max-w-[90px]">{user?.name}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Super admin</div>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="md:ml-[190px] mt-14 w-full md:w-[calc(100%-190px)] h-[calc(100vh-56px)] overflow-y-auto p-4 md:p-6 bg-gray-50 space-y-6">
        
        {/* SECTION 1: Stats row */}
        {currentPath === '/admin' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Est. Monthly Revenue (MRR)</div>
              <div className="text-[22px] font-black text-gray-900">${(stats.activeCount * 29).toLocaleString()}</div>
              <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">SaaS Recurring MRR</div>
            </div>
            <div className="bg-gray-50 border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">PT Clients</div>
              <div className="text-[22px] font-black text-gray-900">{stats.ptCount}</div>
              <div className="text-[11px] text-[#1D9E75] font-semibold mt-1">Elite tier</div>
            </div>
          </div>
        </>
        )}

        {/* SECTION 2: Renewals & Assignments */}
        {(currentPath === '/admin' || currentPath === '/admin/renewals') && (
        <div className={`grid ${currentPath === '/admin/renewals' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
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
          {currentPath === '/admin' && (
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
          )}
        </div>
        )}

        {/* SECTION 3: Member Tracker Table */}
        {(currentPath === '/admin' || currentPath === '/admin/members') && (
        <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 md:p-4 border-b-[0.5px] border-gray-200 flex flex-col md:flex-row md:items-center justify-between bg-gray-50/50 gap-3">
            <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
              <IdBadge size={16} className="text-[#1D9E75]" /> Member membership tracker
            </div>
            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4 w-full md:w-auto">
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg border-[0.5px] border-gray-200 overflow-x-auto w-full md:w-auto no-scrollbar">
                {['All', 'Active', 'Due soon', 'Expired'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 md:px-3 py-1 text-[10px] md:text-[11px] font-bold rounded-md transition-colors whitespace-nowrap ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button 
                onClick={openAddMemberModal}
                className="text-[11px] font-bold text-white bg-[#1D9E75] px-3 py-1.5 rounded-md hover:bg-[#158260]"
              >
                + Add Member
              </button>
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
        )}

        {/* PLACEHOLDER FOR OTHER ROUTES */}
        {!['/admin', '/admin/members', '/admin/renewals'].includes(currentPath) && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 pt-20">
            <Settings size={48} className="mb-4 text-gray-300 opacity-50" />
            <div className="text-lg font-bold text-gray-700">Under Construction</div>
            <div className="text-xs mt-1">This section is currently being built.</div>
          </div>
        )}
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

      {/* ADD MEMBER MODAL */}
      {addMemberModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border-[0.5px] border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Add New Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Full Name *</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Email Address *</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full border-[0.5px] border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1 block">Membership Plan *</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {templates.membershipPlans.map((p: any) => (
                    <label key={p.id} className="flex items-center gap-2 text-[12px] p-2 hover:bg-gray-50 rounded-md cursor-pointer border-[0.5px] border-transparent hover:border-gray-200">
                      <input 
                        type="radio" 
                        name="membership_plan" 
                        value={p.id} 
                        checked={newMember.planId === String(p.id)}
                        onChange={() => setNewMember({ ...newMember, planId: String(p.id) })}
                        className="accent-[#1D9E75]"
                      />
                      <span>{p.name} <span className="text-gray-400 ml-1">(${p.price} / {p.duration_days} days)</span></span>
                    </label>
                  ))}
                  {templates.membershipPlans.length === 0 && (
                    <div className="text-xs text-gray-400 italic">No plans available.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setAddMemberModal({ isOpen: false })}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-[12px] py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newMember.name || !newMember.email || !newMember.planId}
                className="flex-1 bg-[#1D9E75] hover:bg-[#158260] text-white font-bold text-[12px] py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
