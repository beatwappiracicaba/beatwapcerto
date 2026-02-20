import { Router } from 'express';
import { getProjects } from '../controllers/projects.controller.js';

const router = Router();

router.get('/projects', getProjects);

export default router;
