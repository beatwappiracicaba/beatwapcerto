import { Router } from 'express';
import { getReleases } from '../controllers/releases.controller.js';

const router = Router();

router.get('/', getReleases);

export default router;
