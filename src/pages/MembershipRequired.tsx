import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Utensils, 
  Bot, 
  TrendingUp, 
  Award, 
  Users, 
  Crown, 
  X, 
  Star, 
  ShieldCheck, 
  ChevronRight 
} from 'lucide-react';
import { motion } from 'motion/react';

export function MembershipRequired() {
  const navigate = useNavigate();

  const features = [
    {
      title: "AI Workout Plans",
      description: "Tailored fitness routines built by advanced algorithms just for you.",
      icon: Dumbbell,
      color: "from-purple-500/20 to-indigo-500/20",
      iconColor: "text-purple-400"
    },
    {
      title: "Personalized Diet Plans",
      description: "Customized nutrition and meal suggestions fitting your lifestyle.",
      icon: Utensils,
      color: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-400"
    },
    {
      title: "AI Fitness Coach",
      description: "24/7 intelligent coach for answering queries and guiding workouts.",
      icon: Bot,
      color: "from-pink-500/20 to-purple-500/20",
      iconColor: "text-pink-400"
    },
    {
      title: "Progress Analytics",
      description: "Rich charts and logging tools to track your metrics and see real results.",
      icon: TrendingUp,
      color: "from-indigo-500/20 to-purple-500/20",
      iconColor: "text-indigo-400"
    },
    {
      title: "Trainer Guidance",
      description: "Certified coaching support when you need direct feedback.",
      icon: Award,
      color: "from-violet-500/20 to-blue-500/20",
      iconColor: "text-violet-400"
    },
    {
      title: "Community Challenges",
      description: "Join exciting fitness quests with other active members.",
      icon: Users,
      color: "from-fuchsia-500/20 to-purple-500/20",
      iconColor: "text-fuchsia-400"
    }
  ];

  return (
    <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      {/* Premium animated background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl bg-zinc-950/70 border border-white/5 rounded-3xl overflow-hidden shadow-[0_0_80px_-20px_rgba(168,85,247,0.15)] backdrop-blur-xl flex flex-col z-10"
      >
        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Information, Features & Actions */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                <Crown size={12} className="text-purple-400 fill-purple-400" />
                <span className="text-[10px] tracking-widest font-black uppercase text-purple-300">Membership Required</span>
              </div>

              {/* Heading */}
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.15] text-left mb-4">
                Please Join the Gym <br />
                <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                  to Access Your Account
                </span>
              </h1>

              {/* Description */}
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-lg">
                Your account has not yet been activated by your gym administrator. Join an active membership to unlock AI-powered coaching, personalized workout plans, nutrition guidance, trainer support, and complete fitness tracking.
              </p>

              {/* 6 Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="group relative p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-purple-500/20 hover:bg-zinc-900/50 transition-all overflow-hidden flex gap-3"
                    >
                      {/* Glow Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shrink-0 h-10 w-10`}>
                        <Icon size={18} className={`${feature.iconColor}`} />
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{feature.title}</h4>
                        <p className="text-zinc-500 text-[11px] leading-snug mt-1">{feature.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Actions Section */}
            <div className="border-t border-white/5 pt-6 mt-2">
              <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
                {/* Primary Button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/membership')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-purple-500 hover:to-indigo-500 shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_25px_rgba(168,85,247,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Crown size={16} className="fill-white" />
                  Join Gym Membership
                </motion.button>

                {/* Secondary Button */}
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-6 py-4 bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-300 font-bold rounded-2xl transition-all cursor-pointer text-center"
                >
                  Back to Login
                </button>
              </div>

              {/* Disclaimer */}
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-3">
                <ShieldCheck size={14} className="text-purple-500/70" />
                <span>Secure. Private. Only for Members.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Image & Floating Glass Card */}
          <div className="lg:col-span-5 relative min-h-[380px] lg:min-h-[auto] bg-zinc-900 overflow-hidden flex items-end">
            {/* Background Image */}
            <img 
              src="/gym_membership_banner.png" 
              alt="Premium Gym Environment" 
              className="absolute inset-0 w-full h-full object-cover opacity-90 lg:opacity-100"
            />
            {/* Image Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />

            {/* Close Button overlay */}
            <button 
              onClick={() => navigate('/login')} 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-zinc-300 hover:text-white transition-all backdrop-blur-md cursor-pointer z-20"
            >
              <X size={18} />
            </button>

            {/* Floating Glassmorphic Message Card */}
            <div className="p-6 sm:p-8 w-full z-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-full bg-zinc-950/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-2xl relative overflow-hidden flex gap-4"
              >
                {/* Floating card icon glow */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 h-11 w-11 self-start">
                  <Crown size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-snug">
                    Transform Your Body.<br />
                    <span className="text-purple-400">Transform Your Life.</span>
                  </h3>
                  <p className="text-zinc-300 text-xs mt-1.5 leading-relaxed">
                    Join now and start your fitness journey with us.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer Stats Strip */}
        <div className="border-t border-white/5 bg-zinc-950/90 py-5 px-6 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/5 text-purple-400">
              <Users size={16} />
            </div>
            <div className="text-left">
              <div className="font-black text-sm sm:text-base text-white tracking-tight">500+</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Active Members</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 border-x border-white/5">
            <div className="p-2 rounded-xl bg-purple-500/5 text-yellow-500">
              <Star size={16} className="fill-yellow-500" />
            </div>
            <div className="text-left">
              <div className="font-black text-sm sm:text-base text-white tracking-tight">4.9★</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Member Rating</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/5 text-blue-400">
              <Dumbbell size={16} />
            </div>
            <div className="text-left">
              <div className="font-black text-sm sm:text-base text-white tracking-tight">50+</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Certified Trainers</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
