import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createProfile, getProfileByEmail } from '../models/profiles.model.js';
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

export async function register(req, res, next) {
  try {
    const nome = req.body && (req.body.name ?? req.body.nome) ? String(req.body.name ?? req.body.nome).trim() : '';
    const email = req.body && req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    const passwordRaw = req.body && (req.body.password ?? req.body.senha) ? String(req.body.password ?? req.body.senha) : '';
    const roleRaw = req.body && (req.body.role ?? req.body.cargo) ? String(req.body.role ?? req.body.cargo).trim().toLowerCase() : '';

    if (!nome || !email || !passwordRaw) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const roleMap = {
      produtor: 'Produtor',
      admin: 'Produtor',
      artist: 'Artista',
      artista: 'Artista',
      seller: 'Vendedor',
      vendedor: 'Vendedor',
      composer: 'Compositor',
      compositor: 'Compositor',
    };
    const cargo = roleMap[roleRaw] || 'Artista';

    const existing = await getProfileByEmail(pool, email);
    if (existing) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(passwordRaw, 10);
    const user = await createProfile(pool, { nome, email, cargo, passwordHash });
    if (!user) {
      return res.status(500).json({ error: 'Falha ao criar usuário' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, cargo: user.cargo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}
