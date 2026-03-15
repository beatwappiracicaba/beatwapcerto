const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Profile } = require('../models');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const nome = String(req.body.nome || '').trim();
    const cargo = String(req.body.cargo || '');
    if (!email || !password || !nome || !cargo) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    const hash = await bcrypt.hash(password, 10);
    const user = await Profile.create({ email, password_hash: hash, cargo, nome });
    return res.json({ ok: true, data: { id: user.id } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    const user = await Profile.findOne({ where: { email } });
    if (!user || !user.password_hash) return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    const token = jwt.sign({ sub: user.id, email: user.email, cargo: user.cargo }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    const map = { Artista: '/dashboard', Compositor: '/dashboard', Vendedor: '/seller', Produtor: '/admin' };
    const redirect = map[user.cargo] || '/dashboard';
    return res.json({ ok: true, token, redirect });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.get('/callback', (req, res) => {
  return res.json({ ok: true });
});

module.exports = router;
