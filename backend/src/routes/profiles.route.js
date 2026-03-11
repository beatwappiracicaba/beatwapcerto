import { Router } from 'express';
import { getMyProfile, getProfiles } from '../controllers/profiles.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/profiles', getProfiles);
router.get('/profile', authRequired, getMyProfile);

export default router;
