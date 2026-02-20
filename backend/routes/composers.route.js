import { Router } from 'express';
import { getComposers } from '../controllers/composers.controller.js';

const router = Router();

router.get('/composers', getComposers);

export default router;
