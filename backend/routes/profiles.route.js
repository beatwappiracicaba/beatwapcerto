import { Router } from 'express';
import { getArtists } from '../controllers/profiles.controller.js';

const router = Router();

router.get('/', getArtists);

export default router;
