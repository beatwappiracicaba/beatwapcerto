import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getProfileByEmail } from '../models/profiles.model.js';
import { pool } from '../db.js';

export async function login(req, res, next) {
  try {
    const email = req.body && req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    const passwordRaw = req.body && (req.body.password ?? req.body.senha) ? String(req.body.password ?? req.body.senha) : '';

    if (!email || !passwordRaw) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await getProfileByEmail(pool, email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const ok = await bcrypt.compare(passwordRaw, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, cargo: user.cargo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
}

