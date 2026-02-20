import { Router } from 'express';
import { getAllArtists } from '../controllers/artists.controller.js';

const router = Router();

router.get('/profiles/artists/all', getAllArtists);

export default router;
