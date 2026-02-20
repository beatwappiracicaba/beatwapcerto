import { Router } from 'express';
import { getCompositions } from '../controllers/compositions.controller.js';

const router = Router();

router.get('/compositions', getCompositions);

export default router;
