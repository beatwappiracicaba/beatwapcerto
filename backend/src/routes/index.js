import { Router } from 'express';
import releasesRoutes from './releases.route.js';
import profilesRoutes from './profiles.route.js';
import authRoutes from './auth.route.js';

const router = Router();

router.use(releasesRoutes);
router.use(profilesRoutes);
router.use(authRoutes);

router.get('/compositions', (req, res) => res.json([]));
router.get('/projects', (req, res) => res.json([]));
router.get('/composers', (req, res) => res.json([]));
router.get('/sponsors', (req, res) => res.json([]));
router.get('/producers', (req, res) => res.json([]));
router.get('/users', (req, res) => res.json([]));
router.get('/artists', (req, res) => res.json([]));

export default router;
