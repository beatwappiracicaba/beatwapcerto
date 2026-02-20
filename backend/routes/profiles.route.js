import { Router } from 'express';
import { getArtists } from '../controllers/profiles.controller.js';

const router = Router();

router.get('/profiles', getArtists);

export default router;
