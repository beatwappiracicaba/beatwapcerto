import { listReleases } from '../models/releases.model.js';
import { pool } from '../db.js';

export async function getReleases(req, res, next) {
  try {
    const rows = await listReleases(pool);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

