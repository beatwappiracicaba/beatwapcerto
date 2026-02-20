import { Router } from 'express';
import { getUsersByRole } from '../controllers/users.controller.js';

const router = Router();

router.get('/users', getUsersByRole);

export default router;
