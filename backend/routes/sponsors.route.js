import { Router } from 'express';
import { getSponsors } from '../controllers/sponsors.controller.js';

const router = Router();

router.get('/sponsors', getSponsors);

export default router;
