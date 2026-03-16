const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Profile } = require('../models');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const emailRaw = req.body.email ?? req.body?.user?.email;
    const email = String(emailRaw || '').trim().toLowerCase();
    const password = String(req.body.password || req.body?.user?.password || '');
    const nomeRaw = req.body.name ?? req.body.nome ?? req.body?.user?.name;
    const nome = String(nomeRaw || '').trim();
    const cargoRaw = req.body.role ?? req.body.cargo ?? req.body?.user?.role;
    const cargo = String(cargoRaw || '').trim();
    if (!email || !password || !nome || !cargo) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    const hash = await bcrypt.hash(password, 10);
    const planoRaw = req.body.plano ?? req.body.plan;
    const plano = planoRaw != null ? String(planoRaw) : null;
    const acIn = req.body.access_control;
    let access_control = null;
    if (acIn && typeof acIn === 'object') {
      access_control = acIn;
    } else {
      const get = (k) => {
        const v = req.body[k];
        if (v === true) return true;
        if (v === '1') return true;
        return false;
      };
      if (cargo === 'Produtor') {
        access_control = {
          chat: get('p_chat') || true,
          admin_artists: get('p_admin_artists') || true,
          admin_composers: get('p_admin_composers') || true,
          admin_sellers: get('p_admin_sellers') || true,
          admin_musics: get('p_admin_musics') || true,
          admin_compositions: get('p_admin_compositions') || true,
          admin_sponsors: get('p_admin_sponsors') || true,
          admin_settings: get('p_admin_settings') || true,
          admin_finance: get('p_admin_finance') || true,
          marketing: get('p_marketing') || true
        };
      } else if (cargo === 'Vendedor') {
        access_control = {
          chat: get('p_chat') || true,
          seller_artists: get('p_seller_artists') || true,
          seller_calendar: get('p_seller_calendar') || true,
          seller_leads: get('p_seller_leads') || true,
          seller_finance: get('p_seller_finance') || true,
          seller_proposals: get('p_seller_proposals') || true,
          seller_communications: get('p_seller_communications') || true
        };
      } else if (cargo === 'Compositor') {
        access_control = {
          chat: get('p_chat') || true,
          compositions: get('p_compositions') || true,
          marketing: get('p_marketing') || true,
          finance: get('p_finance') || true
        };
      } else {
        access_control = {
          chat: get('p_chat') || true,
          musics: get('p_musics') || true,
          work: get('p_work') || true,
          marketing: get('p_marketing') || true,
          finance: get('p_finance') || true
        };
      }
    }
    const user = await Profile.create({ email, password_hash: hash, cargo, nome, plano, access_control });
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
    const map = { Artista: '/dashboard-artista', Compositor: '/dashboard-compositor', Vendedor: '/dashboard-vendedor', Produtor: '/dashboard-produtor' };
    const redirect = map[user.cargo] || '/';
    return res.json({ ok: true, token, user: { id: user.id, email: user.email, cargo: user.cargo, nome: user.nome }, redirect });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

module.exports = router;
