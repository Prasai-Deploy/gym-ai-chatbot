import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "",
  { auth: { persistSession: false } }
);

const router = express.Router();

// Middleware to check if user is admin
router.use(async (req, res, next) => {
  const user = (req as any).user;
  if (!user || !user.email) {
    return res.status(403).json({ error: 'Access denied: Authentication required.' });
  }

  try {
    const { data: adminRecord } = await supabaseAdmin.from('admins').select('*').eq('email', user.email).maybeSingle();
    if (!adminRecord) {
      return res.status(403).json({ error: 'Access denied: Administrators only.' });
    }
    // Attach admin role info
    (req as any).adminRole = adminRecord.role;
    (req as any).adminId = adminRecord.id;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error during admin check.' });
  }
});

// GET /api/admin/allowed-users
router.get('/allowed-users', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('allowed_users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/allowed-users
router.post('/allowed-users', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const { data, error } = await supabaseAdmin.from('allowed_users').insert([{ email: email.trim() }]).select().single();
    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Email already exists in the whitelist' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/allowed-users/:id
router.delete('/allowed-users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('allowed_users').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/members
router.get('/members', async (req, res) => {
  try {
    const adminRole = (req as any).adminRole;
    const adminId = (req as any).adminId;

    let query = supabaseAdmin.from('users').select(`
      id, name, email, avatar, phone,
      memberships (
        id, status, admission_date, expiry_date,
        membership_plans (name, price)
      ),
      pt_assignments (trainer_id)
    `);

    if (adminRole === 'trainer') {
      // Trainers only see their own clients
      const { data: ptData } = await supabaseAdmin.from('pt_assignments').select('client_id').eq('trainer_id', adminId);
      const clientIds = ptData?.map(p => p.client_id) || [];
      if (clientIds.length > 0) {
        query = query.in('id', clientIds);
      } else {
        return res.json([]); // No clients
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch assignments separately to check if they have plans
    const { data: wAssigns } = await supabaseAdmin.from('user_workout_assignments').select('user_id, active').eq('active', true);
    const { data: dAssigns } = await supabaseAdmin.from('user_diet_assignments').select('user_id, active').eq('active', true);

    const wSet = new Set(wAssigns?.map(a => a.user_id));
    const dSet = new Set(dAssigns?.map(a => a.user_id));

    const enhancedData = data.map(user => {
      const activeMembership = user.memberships?.find((m: any) => m.status === 'active' || m.status === 'due_soon');
      return {
        ...user,
        activeMembership,
        hasWorkout: wSet.has(user.id),
        hasDiet: dSet.has(user.id)
      };
    });

    res.json(enhancedData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const adminRole = (req as any).adminRole;
    // Basic stats for dashboard
    const { data: members, error } = await supabaseAdmin.from('memberships').select('status, membership_plans(price)');
    if (error) throw error;

    let activeCount = 0;
    let dueSoonCount = 0;
    let expiredCount = 0;
    let revenue = 0;

    members?.forEach((m: any) => {
      if (m.status === 'active') activeCount++;
      else if (m.status === 'due_soon') dueSoonCount++;
      else if (m.status === 'expired') expiredCount++;

      if (m.status === 'active' || m.status === 'due_soon') {
        revenue += parseFloat(m.membership_plans?.price || 0);
      }
    });

    res.json({ activeCount, dueSoonCount, expiredCount, revenue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/plans
router.get('/plans', async (req, res) => {
  try {
    const { data: workoutPlans } = await supabaseAdmin.from('template_workout_plans').select('*');
    const { data: dietPlans } = await supabaseAdmin.from('template_diet_plans').select('*');
    res.json({ workoutPlans, dietPlans });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/membership-plans
router.get('/membership-plans', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('membership_plans').select('*').order('price', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/members
router.post('/members', async (req, res) => {
  try {
    const { name, email, phone, planId } = req.body;
    if (!name || !email || !planId) {
      return res.status(400).json({ error: 'Name, email, and plan are required' });
    }

    // 1. Fetch the selected plan
    const { data: plan, error: planError } = await supabaseAdmin.from('membership_plans').select('*').eq('id', planId).single();
    if (planError || !plan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const now = new Date().toISOString();

    // 2. Insert or find user
    let user;
    const { data: existingUser } = await supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle();
    
    if (existingUser) {
      user = existingUser;
    } else {
      const { data: newUser, error: userError } = await supabaseAdmin.from('users').insert({
        name,
        email,
        phone,
        created_at: now,
        last_login: now
      }).select().single();
      
      if (userError) throw userError;
      user = newUser;
    }

    // 3. Create membership record
    // Calculate expiry date
    const admissionDate = new Date();
    const expiryDate = new Date(admissionDate.getTime() + (plan.duration_days * 86400000));

    const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships').insert({
      user_id: user.id,
      plan_id: plan.id,
      admission_date: admissionDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      status: 'active'
    }).select().single();

    if (membershipError) throw membershipError;

    // Optional: Whitelist the user so they can log in via Google
    await supabaseAdmin.from('allowed_users').insert({ email }).select().maybeSingle();

    res.json({ success: true, user, membership });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/assign-plan
router.post('/assign-plan', async (req, res) => {
  try {
    const adminId = (req as any).adminId;
    const adminRole = (req as any).adminRole;
    const { userId, planId, planType } = req.body;

    if (!userId || !planId || !planType) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    if (adminRole === 'trainer') {
       const { data: ptData } = await supabaseAdmin.from('pt_assignments').select('*').eq('client_id', userId).eq('trainer_id', adminId).maybeSingle();
       if (!ptData) {
         return res.status(403).json({ error: 'Trainers can only assign plans to their own clients.' });
       }
    }

    const { data: memberships } = await supabaseAdmin.from('memberships').select('status, membership_plans(name, features)').eq('user_id', userId);
    const activeMembership = memberships?.find(m => m.status === 'active' || m.status === 'due_soon');
    
    if (!activeMembership || ((activeMembership.membership_plans as any)?.name === 'Basic')) {
       return res.status(403).json({ error: 'User must have Premium or PT membership to receive assignments.' });
    }

    if (planType === 'workout') {
       await supabaseAdmin.from('user_workout_assignments').update({ active: false }).eq('user_id', userId);
       const { data, error } = await supabaseAdmin.from('user_workout_assignments').insert({
         user_id: userId,
         plan_id: planId,
         assigned_by: adminId,
         active: true
       });
       if (error) throw error;
       return res.json({ success: true, data });
    } else if (planType === 'diet') {
       await supabaseAdmin.from('user_diet_assignments').update({ active: false }).eq('user_id', userId);
       const { data, error } = await supabaseAdmin.from('user_diet_assignments').insert({
         user_id: userId,
         plan_id: planId,
         assigned_by: adminId,
         active: true
       });
       if (error) throw error;
       return res.json({ success: true, data });
    } else {
       return res.status(400).json({ error: 'Invalid planType' });
    }

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/dashboard-data
router.get('/dashboard-data', async (req, res) => {
  try {
    // Priority 1: Stats
    const { count: totalMembers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: activeCount } = await supabaseAdmin.from('memberships').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
    
    const { count: expiringCount } = await supabaseAdmin.from('memberships')
      .select('*', { count: 'exact', head: true })
      .gte('expiry_date', today)
      .lte('expiry_date', in7)
      .neq('status', 'expired');

    const { count: ptCount } = await supabaseAdmin.from('memberships')
      .select('*, membership_plans!inner(name)', { count: 'exact', head: true })
      .ilike('membership_plans.name', '%personal%');

    // Priority 2: Renewals
    const { data: renewals } = await supabaseAdmin.from('memberships')
      .select(`
        id,
        admission_date,
        expiry_date,
        status,
        users (id, name, email),
        membership_plans (name)
      `)
      .or(`expiry_date.lte.${in7},status.eq.expired`)
      .order('expiry_date', { ascending: true });

    // Priority 3: Assignments
    const { data: workoutAssignments } = await supabaseAdmin.from('user_workout_assignments')
      .select(`
        id,
        assigned_at,
        active,
        users (id, name),
        template_workout_plans (name, tier),
        assigned_by_user:admins!user_workout_assignments_assigned_by_fkey (name)
      `)
      .eq('active', true)
      .order('assigned_at', { ascending: false })
      .limit(5);

    const { data: dietAssignments } = await supabaseAdmin.from('user_diet_assignments')
      .select(`
        id,
        assigned_at,
        active,
        users (id, name),
        template_diet_plans (name, tier),
        assigned_by_user:admins!user_diet_assignments_assigned_by_fkey (name)
      `)
      .eq('active', true)
      .order('assigned_at', { ascending: false })
      .limit(5);

    // Priority 4: Members Table
    const { data: members } = await supabaseAdmin.from('memberships')
      .select(`
        id,
        admission_date,
        expiry_date,
        status,
        users (id, name, email),
        membership_plans (id, name),
        user_workout_assignments (id, active),
        user_diet_assignments (id, active)
      `)
      .order('admission_date', { ascending: false });

    res.json({
      stats: {
        totalMembers: totalMembers || 0,
        activeCount: activeCount || 0,
        expiringCount: expiringCount || 0,
        ptCount: ptCount || 0
      },
      renewals: renewals || [],
      workoutAssignments: workoutAssignments || [],
      dietAssignments: dietAssignments || [],
      members: members || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
