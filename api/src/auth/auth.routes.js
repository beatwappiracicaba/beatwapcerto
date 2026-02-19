import express from 'express';
import { register, login, refresh, logout } from './auth.controller.js';
import { loginLimiter, requireAuth, requireRoles } from './auth.middleware.js';

export const authRouter = express.Router();

// Namespaced
authRouter.post('/auth/register', register);
authRouter.post('/auth/login', loginLimiter, login);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', requireAuth, logout);

// Backwards compatibility (existing frontend may call root endpoints)
authRouter.post('/register', register);
authRouter.post('/login', loginLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', requireAuth, logout);

// Example of role protection usage (keep here as reference endpoint)
authRouter.get('/auth/me/admin-check', requireAuth, requireRoles('Admin', 'Produtor'), (_req, res) => {
  return res.json({ ok: true });
});
