import { Router } from 'express';
import releasesRoutes from './releases.route.js';
import profilesRoutes from './profiles.route.js';
import authRoutes from './auth.route.js';

const router = Router();

router.use(releasesRoutes);
router.use(profilesRoutes);
router.use(authRoutes);

export default router;

