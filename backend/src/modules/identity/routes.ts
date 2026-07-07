import { Router } from 'express';
import { IdentityController } from './controllers/IdentityController';
import { IdentityService } from './services/IdentityService';
import { IdentityRepository } from './repositories/IdentityRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';

const router = Router();

// Dependency Injection wiring
const repository = new IdentityRepository(supabase);
const service = new IdentityService(repository);
const controller = new IdentityController(service);

// Routes
router.get('/profile', requireAuth, controller.getProfile);
router.patch('/profile', requireAuth, controller.updateProfile);

router.get('/profile/fitness', requireAuth, controller.getFitnessProfile);
router.patch('/profile/fitness', requireAuth, controller.updateFitnessProfile);

router.get('/profile/preferences', requireAuth, controller.getPreferences);
router.patch('/profile/preferences', requireAuth, controller.updatePreferences);

// Demo user reset endpoint
router.post('/demo/reset', requireAuth, controller.resetDemoData);

// /me returns a composite of all user data in a single call
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const [profile, fitness, preferences] = await Promise.all([
      service.getProfile(userId),
      service.getFitnessProfile(userId),
      service.getPreferences(userId)
    ]);

    if (profile.isFailure()) throw profile.error;

    return res.status(200).json({
      success: true,
      data: {
        profile: profile.isSuccess() ? profile.value : null,
        fitness: fitness.isSuccess() ? fitness.value : null,
        preferences: preferences.isSuccess() ? preferences.value : null,
      }
    });
  } catch (err) {
    next(err);
  }
});

export const identityRouter = router;
