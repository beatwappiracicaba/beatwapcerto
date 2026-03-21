const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Profile, Invite } = require('../models');
const { auth } = require('../middleware/auth');
const { sendInviteEmail, sendCodeEmail, sendPasswordResetEmail } = require('../services/mailer');
const { logAudit } = require('../services/auditLogger');
const { v4: uuidv4 } = require('uuid');
const { memory, scheduleSave } = require('../memoryStore');

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeCargoInput(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'admin' || s === 'produtor' || s === 'producer') return 'Produtor';
  if (s === 'vendedor' || s === 'seller' || s === 'sales') return 'Vendedor';
  if (s === 'compositor' || s === 'composer') return 'Compositor';
  if (s === 'artista' || s === 'artist') return 'Artista';
  return String(value || '').trim();
}

function normalizePlanoInput(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'avulso') return 'avulso';
  if (s === 'mensal') return 'mensal';
  if (s === 'premium') return 'premium';
  return String(value || '').trim();
}

function computeNomeCompletoRazaoSocial(nomeCompleto, razaoSocial) {
  const a = String(nomeCompleto || '').trim();
  const b = String(razaoSocial || '').trim();
  if (a && b) return `${a} / ${b}`;
  return a || b || null;
}

function computeCpfCnpj(cpf, cnpj) {
  const a = String(cpf || '').trim();
  const b = String(cnpj || '').trim();
  if (a && b) return `${a} / ${b}`;
  return a || b || null;
}

function getEmailCodeSecret() {
  return String(process.env.EMAIL_CODE_SECRET || process.env.JWT_SECRET || 'devsecret');
}

function hashEmailCode(email, code) {
  return crypto
    .createHash('sha256')
    .update(`${String(email || '').trim().toLowerCase()}|${String(code || '').trim()}|${getEmailCodeSecret()}`)
    .digest('hex');
}

function getEmailVerificationBucket() {
  if (!memory.email_verification || typeof memory.email_verification !== 'object') memory.email_verification = {};
  return memory.email_verification;
}

function getEmailVerificationEntry(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;
  const bucket = getEmailVerificationBucket();
  const entry = bucket[key] || null;
  if (!entry) return null;
  const exp = entry?.expires_at ? new Date(String(entry.expires_at)) : null;
  if (!exp || exp.getTime() <= Date.now()) {
    delete bucket[key];
    scheduleSave();
    return null;
  }
  return entry;
}

function setEmailVerificationEntry(email, entry) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return;
  const bucket = getEmailVerificationBucket();
  bucket[key] = entry;
  scheduleSave();
}

function consumeEmailVerificationEntry(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return;
  const bucket = getEmailVerificationBucket();
  delete bucket[key];
  scheduleSave();
}

async function ensureEmailNotRegistered(email) {
  const exists = await Profile.findOne({ where: { email } });
  return !exists;
}

router.post('/register/request-code', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Email obrigatório' });
    const can = await ensureEmailNotRegistered(email);
    if (!can) return res.status(400).json({ ok: false, error: 'Email já cadastrado' });

    const existing = getEmailVerificationEntry(email);
    const now = Date.now();
    const cooldownMs = 60 * 1000;
    const lastSentAt = existing?.sent_at ? new Date(String(existing.sent_at)).getTime() : 0;
    if (existing && lastSentAt && now - lastSentAt < cooldownMs) {
      return res.json({ ok: true, email, cooldown: true });
    }

    const code = generateCode();
    const ttlMin = Number(process.env.EMAIL_CODE_TTL_MINUTES || 15);
    const expires_at = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
    setEmailVerificationEntry(email, {
      code_hash: hashEmailCode(email, code),
      sent_at: new Date().toISOString(),
      expires_at,
      attempts: 0
    });
    await sendCodeEmail(email, code).catch(() => {});
    return res.json({ ok: true, email, expires_at });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

function verifyEmailCodeOrThrow(email, code) {
  const entry = getEmailVerificationEntry(email);
  if (!entry) return { ok: false, error: 'Código expirado' };
  const attempts = Number(entry?.attempts || 0);
  if (attempts >= 5) return { ok: false, error: 'Muitas tentativas. Solicite um novo código.' };
  const expected = String(entry?.code_hash || '');
  const actual = hashEmailCode(email, code);
  if (!expected || actual !== expected) {
    setEmailVerificationEntry(email, { ...entry, attempts: attempts + 1 });
    return { ok: false, error: 'Código inválido' };
  }
  consumeEmailVerificationEntry(email);
  return { ok: true };
}

router.post('/register', async (req, res) => {
  try {
    const emailRaw = req.body.email ?? req.body?.user?.email;
    const email = String(emailRaw || '').trim().toLowerCase();
    const password = String(req.body.password || req.body?.user?.password || '');
    const nomeRaw = req.body.name ?? req.body.nome ?? req.body?.user?.name;
    const nome = String(nomeRaw || '').trim();
    const code = String(req.body.code || '').trim();
    const cargoRaw = req.body.role ?? req.body.cargo ?? req.body?.user?.role;
    const cargo = normalizeCargoInput(cargoRaw);

    const nome_completo = String(req.body?.nome_completo || '').trim();
    const razao_social = String(req.body?.razao_social || '').trim();
    const cpf = String(req.body?.cpf || '').trim();
    const cnpj = String(req.body?.cnpj || '').trim();
    const celular = String(req.body?.celular || '').trim();
    const telefone = String(req.body?.telefone || '').trim();
    const genero_musical = String(req.body?.genero_musical || '').trim();
    const cep = String(req.body?.cep || '').trim();
    const logradouro = String(req.body?.logradouro || '').trim();
    const complemento = String(req.body?.complemento || '').trim();
    const bairro = String(req.body?.bairro || '').trim();
    const cidade = String(req.body?.cidade || '').trim();
    const estado = String(req.body?.estado || '').trim();
    const referred_by = req.body?.referred_by ? String(req.body.referred_by).trim() : null;

    const contract_accepted = req.body?.contract_accepted === true || req.body?.agreeLegal === true || req.body?.agree_legal === true;

    if (!email || !password || !cargo) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    if (!nome_completo || !celular || !genero_musical || !cidade || !estado || !contract_accepted) {
      return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    }
    if (cargo !== 'Artista' && cargo !== 'Compositor') {
      return res.status(403).json({ ok: false, error: 'Cadastro permitido apenas para Artista ou Compositor' });
    }
    if (!code) return res.status(400).json({ ok: false, error: 'Código obrigatório' });
    const v = verifyEmailCodeOrThrow(email, code);
    if (!v.ok) return res.status(400).json({ ok: false, error: v.error });

    const hash = await bcrypt.hash(password, 10);
    const planoRaw = req.body.plano ?? req.body.plan;
    const plano = normalizePlanoInput(planoRaw) || 'avulso';
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
    const nome_completo_razao_social = computeNomeCompletoRazaoSocial(nome_completo, razao_social);
    const cpf_cnpj = computeCpfCnpj(cpf, cnpj);
    const user = await Profile.create({
      email,
      password_hash: hash,
      cargo,
      status: 'ativo',
      plano,
      creditos_envio: 0,
      nome: nome || null,
      nome_completo,
      razao_social: razao_social || null,
      cpf: cpf || null,
      cnpj: cnpj || null,
      telefone: telefone || null,
      celular,
      genero_musical,
      cep: cep || null,
      logradouro: logradouro || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade,
      estado,
      nome_completo_razao_social,
      cpf_cnpj,
      referred_by,
      contract_accepted_at: new Date(),
      email_verified: true,
      access_control
    });
    const jwtToken = jwt.sign({ sub: user.id, email: user.email, cargo: user.cargo }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    const map = { Artista: '/dashboard-artista', Compositor: '/dashboard-compositor', Vendedor: '/dashboard-vendedor', Produtor: '/dashboard-produtor' };
    const redirect = map[user.cargo] || '/';
    return res.json({ ok: true, token: jwtToken, user: { id: user.id, email: user.email, cargo: user.cargo, nome: user.nome }, redirect });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      await logAudit({
        action: 'auth.login',
        email,
        status: 'missing_fields',
        ip: String(req.headers['x-real-ip'] || req.ip || ''),
        user_agent: String(req.headers['user-agent'] || '')
      });
      return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    }
    const user = await Profile.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      await logAudit({
        action: 'auth.login',
        email,
        status: 'user_not_found',
        ip: String(req.headers['x-real-ip'] || req.ip || ''),
        user_agent: String(req.headers['user-agent'] || '')
      });
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }
    if (String(user?.status || '').toLowerCase().trim() === 'bloqueado') {
      return res.status(403).json({ ok: false, error: 'Conta bloqueada' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await logAudit({
        action: 'auth.login',
        email,
        user_id: user.id,
        status: 'invalid_password',
        ip: String(req.headers['x-real-ip'] || req.ip || ''),
        user_agent: String(req.headers['user-agent'] || '')
      });
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email, cargo: user.cargo }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    const map = { Artista: '/dashboard-artista', Compositor: '/dashboard-compositor', Vendedor: '/dashboard-vendedor', Produtor: '/dashboard-produtor' };
    const redirect = map[user.cargo] || '/';
    await logAudit({
      action: 'auth.login',
      email,
      user_id: user.id,
      status: 'success',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || '')
    });
    return res.json({ ok: true, token, user: { id: user.id, email: user.email, cargo: user.cargo, nome: user.nome }, redirect });
  } catch (e) {
    try {
      await logAudit({
        action: 'auth.login',
        email: String(req.body.email || '').trim().toLowerCase(),
        status: 'exception',
        ip: String(req.headers['x-real-ip'] || req.ip || ''),
        user_agent: String(req.headers['user-agent'] || ''),
        details: { message: e?.message || 'error' }
      });
    } catch {}
    return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
  }
});

router.post('/admin/create-invite', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Email obrigatório' });
    const plano = normalizePlanoInput(req.body.plano) || undefined;
    const role = normalizeCargoInput(req.body.role) || undefined;
    const name = req.body.name ? String(req.body.name).trim() : undefined;
    const p_chat = req.body.p_chat != null ? !!req.body.p_chat : undefined;
    const p_musics = req.body.p_musics != null ? !!req.body.p_musics : undefined;
    const p_work = req.body.p_work != null ? !!req.body.p_work : undefined;
    const p_marketing = req.body.p_marketing != null ? !!req.body.p_marketing : undefined;
    const p_finance = req.body.p_finance != null ? !!req.body.p_finance : undefined;
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
      if (role === 'Produtor') {
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
      } else if (role === 'Vendedor') {
        access_control = {
          chat: get('p_chat') || true,
          seller_artists: get('p_seller_artists') || true,
          seller_calendar: get('p_seller_calendar') || true,
          seller_leads: get('p_seller_leads') || true,
          seller_finance: get('p_seller_finance') || true,
          seller_proposals: get('p_seller_proposals') || true,
          seller_communications: get('p_seller_communications') || true
        };
      } else if (role === 'Compositor') {
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
    const token = generateToken();
    const ttl = Number(process.env.INVITE_TTL_HOURS || 24);
    const expires_at = new Date(Date.now() + ttl * 60 * 60 * 1000);
    const invite = await Invite.create({
      email,
      role,
      plano,
      name,
      access_control,
      token,
      expires_at,
      created_by: req.user.id
    });
    await sendInviteEmail(email, token, { plano, role, name, p_chat, p_musics, p_work, p_marketing, p_finance })
      .catch(err => console.error('Erro ao enviar convite:', err));
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
    return res.json({
      ok: true,
      email: invite.email,
      expires_at: invite.expires_at,
      role: invite.role || null,
      plano: invite.plano || null,
      name: invite.name || null,
      access_control: invite.access_control || null
    });
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
    const code = String(req.body.code || '').trim();
    const tipo = normalizeCargoInput(req.body.tipo || '');
    const cargoIn = normalizeCargoInput(req.body.cargo || req.body.role || '');

    const nome_completo = String(req.body?.nome_completo || '').trim();
    const razao_social = String(req.body?.razao_social || '').trim();
    const cpf = String(req.body?.cpf || '').trim();
    const cnpj = String(req.body?.cnpj || '').trim();
    const celular = String(req.body?.celular || '').trim();
    const telefone = String(req.body?.telefone || '').trim();
    const genero_musical = String(req.body?.genero_musical || '').trim();
    const cep = String(req.body?.cep || '').trim();
    const logradouro = String(req.body?.logradouro || '').trim();
    const complemento = String(req.body?.complemento || '').trim();
    const bairro = String(req.body?.bairro || '').trim();
    const cidade = String(req.body?.cidade || '').trim();
    const estado = String(req.body?.estado || '').trim();
    const referred_by = req.body?.referred_by ? String(req.body.referred_by).trim() : null;
    const contract_accepted = req.body?.contract_accepted === true || req.body?.agreeLegal === true || req.body?.agree_legal === true;

    if (!token || !email || !password) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    if (!nome_completo || !celular || !genero_musical || !cidade || !estado || !contract_accepted) {
      return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    }
    const invite = await Invite.findOne({ where: { token } });
    if (!invite || invite.used || new Date(invite.expires_at) < new Date() || invite.email.toLowerCase() !== email) {
      return res.status(400).json({ ok: false, error: 'Convite inválido' });
    }
    const exists = await Profile.findOne({ where: { email } });
    if (exists) return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
    const cargoFromInvite = normalizeCargoInput(invite.role || '');
    if (!cargoFromInvite) return res.status(400).json({ ok: false, error: 'Convite inválido' });
    if (tipo && tipo !== cargoFromInvite) return res.status(403).json({ ok: false, error: 'Tipo inválido' });
    if (cargoIn && cargoIn !== cargoFromInvite) return res.status(403).json({ ok: false, error: 'Tipo inválido' });
    const cargo = cargoFromInvite;
    if (!code) return res.status(400).json({ ok: false, error: 'Código obrigatório' });
    const v = verifyEmailCodeOrThrow(email, code);
    if (!v.ok) return res.status(400).json({ ok: false, error: v.error });

    const hash = await bcrypt.hash(password, 10);
    const plano = normalizePlanoInput(req.body.plano) || normalizePlanoInput(invite.plano) || 'avulso';
    const access_control = (invite.access_control && typeof invite.access_control === 'object')
      ? invite.access_control
      : { verified: true, chat: true };
    const nome_completo_razao_social = computeNomeCompletoRazaoSocial(nome_completo, razao_social);
    const cpf_cnpj = computeCpfCnpj(cpf, cnpj);
    const user = await Profile.create({
      email,
      password_hash: hash,
      cargo,
      status: 'ativo',
      plano,
      creditos_envio: 0,
      nome: nome || null,
      nome_completo,
      razao_social: razao_social || null,
      cpf: cpf || null,
      cnpj: cnpj || null,
      telefone: telefone || null,
      celular,
      genero_musical,
      cep: cep || null,
      logradouro: logradouro || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade,
      estado,
      nome_completo_razao_social,
      cpf_cnpj,
      referred_by,
      contract_accepted_at: new Date(),
      email_verified: true,
      access_control
    });
    invite.used = true;
    await invite.save();
    const jwtToken = jwt.sign({ sub: user.id, email: user.email, cargo: user.cargo }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    const map = { Artista: '/dashboard-artista', Compositor: '/dashboard-compositor', Vendedor: '/dashboard-vendedor', Produtor: '/dashboard-produtor' };
    const redirect = map[user.cargo] || '/';
    return res.json({ ok: true, token: jwtToken, user: { id: user.id, email: user.email, cargo: user.cargo, nome: user.nome }, redirect });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email não cadastrado' });
    }
    const user = await Profile.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email não cadastrado' });
    }
    const code = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    user.reset_code = code;
    user.reset_expires = expires;
    await user.save();
    const base = process.env.APP_PUBLIC_URL || 'https://www.beatwap.com.br';
    const link = `${base.replace(/\/+$/, '')}/reset-password?code=${encodeURIComponent(code)}`;
    await sendPasswordResetEmail(email, link, code).catch(() => {});
    return res.json({ success: true, message: 'Email de redefinição enviado' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro interno' });
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
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || req.body.password || '').trim();
    if (!code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado' });
    }
    const user = await Profile.findOne({ where: { reset_code: code } });
    const valid = !!user && user.reset_code === code && new Date(user.reset_expires) > new Date();
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    user.password_hash = hash;
    user.reset_code = null;
    user.reset_expires = null;
    await user.save();
    return res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

router.get('/admin/invites', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const statusFilter = String(req.query.status || '').trim().toLowerCase();
    const list = await Invite.findAll({ order: [['createdAt', 'DESC']] });
    const now = new Date();
    const mapped = list.map(i => {
      const expired = new Date(i.expires_at) <= now;
      const status = i.used ? 'used' : (expired ? 'expired' : 'pending');
      return {
        id: i.id,
        email: i.email,
        token: i.token,
        expires_at: i.expires_at,
        used: i.used,
        created_by: i.created_by,
        status
      };
    });
    const filtered = statusFilter ? mapped.filter(m => m.status === statusFilter) : mapped;
    return res.json({ ok: true, invites: filtered });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/admin/invites/:id/resend', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const invite = await Invite.findByPk(id);
    if (!invite) return res.status(404).json({ ok: false, error: 'Convite não encontrado' });
    if (invite.used) return res.status(400).json({ ok: false, error: 'Convite já utilizado' });
    const now = new Date();
    if (new Date(invite.expires_at) <= now) return res.status(400).json({ ok: false, error: 'Convite expirado' });
    await sendInviteEmail(invite.email, invite.token).catch(err => console.error('Erro ao reenviar convite:', err));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/admin/invites/:id/regenerate', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const invite = await Invite.findByPk(id);
    if (!invite) return res.status(404).json({ ok: false, error: 'Convite não encontrado' });
    if (invite.used) return res.status(400).json({ ok: false, error: 'Convite já utilizado' });
    invite.token = generateToken();
    const ttl = Number(process.env.INVITE_TTL_HOURS || 24);
    invite.expires_at = new Date(Date.now() + ttl * 60 * 60 * 1000);
    await invite.save();
    await sendInviteEmail(invite.email, invite.token).catch(err => console.error('Erro ao enviar convite regenerado:', err));
    return res.json({ ok: true, invite: { id: invite.id, token: invite.token, expires_at: invite.expires_at } });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.delete('/admin/invites/:id', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const invite = await Invite.findByPk(id);
    if (!invite) return res.status(404).json({ ok: false, error: 'Convite não encontrado' });
    await invite.destroy();
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

module.exports = router;
