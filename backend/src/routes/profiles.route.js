import { Router } from 'express';
import { getProfiles } from '../controllers/profiles.controller.js';

const router = Router();

router.get('/profiles', getProfiles);

export default router;

