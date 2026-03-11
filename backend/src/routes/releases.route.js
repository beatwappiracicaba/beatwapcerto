import { Router } from 'express';
import { getReleases } from '../controllers/releases.controller.js';

const router = Router();

router.get('/releases', getReleases);

export default router;

