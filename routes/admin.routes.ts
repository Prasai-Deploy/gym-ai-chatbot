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
router.use((req, res, next) => {
  const user = (req as any).user;
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Access denied: Administrators only.' });
  }
  next();
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

export default router;
