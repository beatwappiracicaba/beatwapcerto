import { Router } from 'express';
import { getProducers } from '../controllers/producers.controller.js';

const router = Router();

router.get('/', getProducers);

export default router;
