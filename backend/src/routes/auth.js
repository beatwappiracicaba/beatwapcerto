const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Profile, Invite } = require('../models');
const { auth } = require('../middleware/auth');
const { sendInviteEmail, sendCodeEmail } = require('../services/mailer');

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

router.post('/admin/create-invite', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Email obrigatório' });
    const token = generateToken();
    const ttl = Number(process.env.INVITE_TTL_HOURS || 24);
    const expires_at = new Date(Date.now() + ttl * 60 * 60 * 1000);
    const invite = await Invite.create({
      email,
      token,
      expires_at,
      created_by: req.user.id
    });
    await sendInviteEmail(email, token).catch(() => {});
    return res.json({ ok: true, invite: { id: invite.id, email, token, expires_at } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.get('/invite/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    const invite = await Invite.findOne({ where: { token } });
    if (!invite || invite.used || new Date(invite.expires_at) < new Date()) {
      return res.status(404).json({ ok: false, error: 'Token inválido' });
    }
    return res.json({ ok: true, email: invite.email, expires_at: invite.expires_at });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/register-with-invite', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const nome = String(req.body.nome || req.body.name || '').trim();
    const cargo = String(req.body.cargo || req.body.role || '').trim() || 'Artista';
    if (!token || !email || !password || !nome) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    const invite = await Invite.findOne({ where: { token } });
    if (!invite || invite.used || new Date(invite.expires_at) < new Date() || invite.email.toLowerCase() !== email) {
      return res.status(400).json({ ok: false, error: 'Convite inválido' });
    }
    const exists = await Profile.findOne({ where: { email } });
    if (exists) return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
    const hash = await bcrypt.hash(password, 10);
    const user = await Profile.create({
      email,
      password_hash: hash,
      cargo,
      nome,
      access_control: { verified: true, chat: true }
    });
    invite.used = true;
    await invite.save();
    const jwtToken = jwt.sign({ sub: user.id, email: user.email, cargo: user.cargo }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    return res.json({ ok: true, token: jwtToken, user: { id: user.id, email: user.email, cargo: user.cargo, nome: user.nome } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.json({ ok: true });
    const user = await Profile.findOne({ where: { email } });
    if (!user) return res.json({ ok: true });
    const code = generateCode();
    user.reset_code = code;
    user.reset_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendCodeEmail(email, code).catch(() => {});
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/verify-reset-code', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    const user = await Profile.findOne({ where: { email } });
    const valid = !!user && user.reset_code === code && new Date(user.reset_expires) > new Date();
    if (!valid) return res.status(400).json({ ok: false, error: 'Código inválido' });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');
    const user = await Profile.findOne({ where: { email } });
    const valid = !!user && user.reset_code === code && new Date(user.reset_expires) > new Date();
    if (!valid) return res.status(400).json({ ok: false, error: 'Código inválido' });
    const hash = await bcrypt.hash(password, 10);
    user.password_hash = hash;
    user.reset_code = null;
    user.reset_expires = null;
    await user.save();
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

module.exports = router;
