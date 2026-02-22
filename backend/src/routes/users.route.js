import { Router } from 'express';
import { getUsersByRole } from '../controllers/users.controller.js';

const router = Router();

router.get('/', getUsersByRole);

export default router;
