import { Router } from 'express';
import { getSponsors } from '../controllers/sponsors.controller.js';

const router = Router();

router.get('/', getSponsors);

export default router;
