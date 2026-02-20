import { Router } from 'express';
import { getProducers } from '../controllers/producers.controller.js';

const router = Router();

router.get('/home/producers', getProducers);

export default router;
