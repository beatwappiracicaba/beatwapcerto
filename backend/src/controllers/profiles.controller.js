import { listProfiles } from '../models/profiles.model.js';
import { pool } from '../db.js';

export async function getProfiles(req, res, next) {
  try {
    const rows = await listProfiles(pool);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

