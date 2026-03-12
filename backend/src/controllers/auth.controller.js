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
    const planoRaw = req.body && (req.body.plano ?? req.body.plan) ? String(req.body.plano ?? req.body.plan).trim() : '';

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
    const planLower = String(planoRaw || '').toLowerCase();
    const shouldSetStart = !!planoRaw && !planLower.includes('sem') && !planLower.includes('gratuit');
    const user = await createProfile(pool, { nome, email, cargo, passwordHash, plano: planoRaw || null, planStartedAt: shouldSetStart ? new Date().toISOString() : null });
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

export async function changePassword(req, res, next) {
  try {
    const id = req.user && req.user.id ? String(req.user.id) : '';
    if (!id) return res.status(401).json({ error: 'Autenticação necessária' });

    const currentPasswordRaw = req.body && (req.body.current_password ?? req.body.senha_atual ?? req.body.currentPassword)
      ? String(req.body.current_password ?? req.body.senha_atual ?? req.body.currentPassword)
      : '';
    const newPasswordRaw = req.body && (req.body.new_password ?? req.body.nova_senha ?? req.body.newPassword ?? req.body.password ?? req.body.senha)
      ? String(req.body.new_password ?? req.body.nova_senha ?? req.body.newPassword ?? req.body.password ?? req.body.senha)
      : '';

    if (!newPasswordRaw || newPasswordRaw.length < 6) {
      return res.status(400).json({ error: 'Nova senha inválida (mínimo 6 caracteres)' });
    }

    const { rows } = await pool.query(
      'SELECT password_hash FROM public.profiles WHERE id = $1 LIMIT 1',
      [id]
    );
    const row = rows[0] || null;
    if (!row || !row.password_hash) return res.status(404).json({ error: 'Perfil não encontrado' });

    if (currentPasswordRaw) {
      const ok = await bcrypt.compare(currentPasswordRaw, row.password_hash);
      if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const nextHash = await bcrypt.hash(newPasswordRaw, 10);
    await pool.query('UPDATE public.profiles SET password_hash = $2 WHERE id = $1', [id, nextHash]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
