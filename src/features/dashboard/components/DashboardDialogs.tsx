import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Edit2, Shield, LogOut, History, Dumbbell, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardDialogsProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  formData: any;
  setFormData: (data: any) => void;
  onSubmitProgress: (e: React.FormEvent) => void;

  showPlanForm: boolean;
  setShowPlanForm: (show: boolean) => void;
  planForm: any;
  setPlanForm: (data: any) => void;
  onSavePlan: (e: React.FormEvent) => void;

  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  planHistory: any[];

  showProfile: boolean;
  setShowProfile: (show: boolean) => void;
  user: any;
  isEditingProfile: boolean;
  setIsEditingProfile: (editing: boolean) => void;
  editName: string;
  setEditName: (name: string) => void;
  onSaveProfile: () => void;
  onLogout: () => void;
}

export const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  showForm, setShowForm, formData, setFormData, onSubmitProgress,
  showPlanForm, setShowPlanForm, planForm, setPlanForm, onSavePlan,
  showHistory, setShowHistory, planHistory,
  showProfile, setShowProfile, user, isEditingProfile, setIsEditingProfile, editName, setEditName, onSaveProfile, onLogout
}) => {
  return (
    <>
      {/* Log Progress Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold">Log Progress</h3>
                  <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white">
                    <Plus className="rotate-45" size={28} />
                  </button>
                </div>

                <form onSubmit={onSubmitProgress} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Workout Name</label>
                    <input
                      required
                      value={formData.workout_name}
                      onChange={e => setFormData({ ...formData, workout_name: e.target.value })}
                      placeholder="e.g. Chest Day"
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Calories (kcal)</label>
                      <input
                        type="number"
                        value={formData.calories}
                        onChange={e => setFormData({ ...formData, calories: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Protein (g)</label>
                      <input
                        type="number"
                        value={formData.protein}
                        onChange={e => setFormData({ ...formData, protein: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Carbs (g)</label>
                      <input
                        type="number"
                        value={formData.carbs}
                        onChange={e => setFormData({ ...formData, carbs: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Fats (g)</label>
                      <input
                        type="number"
                        value={formData.fats}
                        onChange={e => setFormData({ ...formData, fats: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Water (ml)</label>
                    <input
                      type="number"
                      value={formData.water}
                      onChange={e => setFormData({ ...formData, water: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-5 rounded-2xl transition-all active:scale-95 shadow-xl mt-4"
                  >
                    Save Entry
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Plan Modal */}
      <AnimatePresence>
        {showPlanForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 flex-shrink-0 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Daily Protocol</h3>
                <button onClick={() => setShowPlanForm(false)} className="text-zinc-500 hover:text-white">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto">
                <form onSubmit={onSavePlan} className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">
                      <Dumbbell size={16} /> Workout Plan
                    </label>
                    <textarea
                      required
                      value={planForm.workout_plan}
                      onChange={e => setPlanForm({ ...planForm, workout_plan: e.target.value })}
                      placeholder="E.g., 4x10 Pull-ups, 3x15 Push-ups"
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-y"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">
                      <Utensils size={16} /> Nutrition Plan
                    </label>
                    <textarea
                      required
                      value={planForm.diet_plan}
                      onChange={e => setPlanForm({ ...planForm, diet_plan: e.target.value })}
                      placeholder="E.g., Breakfast: Oatmeal & Eggs. Lunch: Chicken & Rice."
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-y"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-5 rounded-2xl transition-all active:scale-95 shadow-xl mt-4"
                  >
                    Lock In Plan
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plan History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 flex-shrink-0 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Plan History</h3>
                  <p className="text-xs text-zinc-500 mt-1">Previous protocols generated for you</p>
                </div>
                <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
                {planHistory.length > 0 ? planHistory.map((h, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex justify-between items-center hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                          <History size={20} />
                       </div>
                       <div>
                          <div className="font-bold text-white">{h.workout_title || h.diet_title || 'Plan Update'}</div>
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{format(new Date(h.created_at), 'MMM dd, yyyy')}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       {h.active ? (
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">Active</span>
                       ) : (
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5 uppercase tracking-widest">Archived</span>
                       )}
                       <Dumbbell size={16} className="text-zinc-600" />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-zinc-500">
                    No plan history found.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-6" onClick={() => setShowProfile(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowProfile(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <img src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'} alt={user?.name || 'User'} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-800 shadow-xl" />

              {isEditingProfile ? (
                <div className="flex items-center gap-2 mb-6">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-zinc-800 text-white font-bold text-xl rounded-xl px-4 py-2 border border-emerald-500/50 outline-none focus:border-emerald-500 text-center"
                    autoFocus
                  />
                  <button onClick={onSaveProfile} className="p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400">
                    <Check size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center mb-6 relative group">
                  <h3 className="text-white text-2xl font-bold">{user?.name || 'User'}</h3>
                  <button
                    onClick={() => {
                      setEditName(user?.name || 'User');
                      setIsEditingProfile(true);
                    }}
                    className="absolute -right-2 top-0 p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 size={14} />
                  </button>
                  <p className="text-zinc-500 mt-1">{user?.email || ''}</p>
                </div>
              )}

              <div className="rounded-2xl p-4 mb-8 text-left" style={{ background: 'var(--surface-elevated)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400 text-sm">Member ID</span>
                  <span className="text-white font-mono text-sm">#{user?.id?.toString().padStart(4, '0') || '0000'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Status</span>
                  <span className="text-emerald-500 font-bold text-sm tracking-widest uppercase">Active</span>
                </div>
              </div>

              {(user as any)?.is_admin && (
                <Link
                  to="/admin"
                  className="w-full bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 mb-3"
                >
                  <Shield size={20} />
                  Admin Dashboard
                </Link>
              )}

              <button
                onClick={onLogout}
                className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
