import { Router } from 'express';
import { getMyProfile, getProfiles, uploadMyAvatar } from '../controllers/profiles.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/profiles', getProfiles);
router.get('/profile', authRequired, getMyProfile);
router.post('/profile/avatar', authRequired, uploadMyAvatar);

export default router;
