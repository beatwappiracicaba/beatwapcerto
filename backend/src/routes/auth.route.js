import { Router } from 'express';
import { login, register, changePassword } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/auth/change-password', authRequired, changePassword);

export default router;
