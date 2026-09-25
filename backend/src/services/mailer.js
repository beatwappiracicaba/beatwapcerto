require('dotenv').config();
const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const enableDebug = !!process.env.SMTP_DEBUG;
  if (!user || !pass) {
    console.warn('SMTP_USER/SMTP_PASS not set. Email sending will fail.');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: enableDebug,
    debug: enableDebug
  });
}

const transporter = createTransport();

class MailerConfigError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MailerConfigError';
    this.code = code;
  }
}

/**
 * Transporte HTTPS (API do Brevo) x SMTP.
 *
 * O VPS nao consegue sair por portas SMTP (587/465/25 sao bloqueadas pelo
 * provedor), mas HTTPS/443 funciona. Por isso a API HTTP tem preferencia e o
 * SMTP fica como fallback para ambientes onde ele funciona (ex: local).
 */
function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || '').trim();
}

function hasSmtpCredentials() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function resolveSender() {
  return String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
}

async function sendViaBrevoApi({ to, subject, html }) {
  const apiKey = getBrevoApiKey();
  const from = resolveSender();
  if (!from) {
    throw new MailerConfigError(
      'Envio de email desativado: defina SMTP_FROM (remetente) no servidor.',
      'MAIL_FROM_MISSING'
    );
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { email: from, name: process.env.SMTP_FROM_NAME || 'BeatWap' },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!res.ok) {
    const message = (data && (data.message || data.code)) || `HTTP ${res.status}`;
    const err = new Error(`Falha ao enviar email (Brevo API): ${message}`);
    err.status = res.status;
    err.provider = 'brevo-api';
    err.response = data;
    throw err;
  }
  return { provider: 'brevo-api', status: res.status, data };
}

/**
 * Falha rapida quando nao ha nenhum transporte utilizavel.
 *
 * Sem isso o nodemailer tenta conectar e so falha depois do timeout da rede
 * (o que no VPS leva minutos e devolve "sucesso" para o usuario final).
 */
function assertMailerConfigured() {
  if (getBrevoApiKey()) return;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  if (hasSmtpCredentials()) {
    // Hostname puro e o esperado. Rejeita URL colada por engano
    // (ex: "https://smtp.gmail.com"), que o nodemailer nao aceita.
    if (/^https?:\/\//i.test(host) || /[/?#]/.test(host)) {
      throw new MailerConfigError(
        `SMTP_HOST invalido: "${host}". Use apenas o hostname do servidor SMTP (ex: smtp.gmail.com).`,
        'SMTP_INVALID_HOST'
      );
    }
    return;
  }
  throw new MailerConfigError(
    'Envio de email desativado: defina BREVO_API_KEY (recomendado) ou SMTP_USER/SMTP_PASS no servidor.',
    'MAILER_NOT_CONFIGURED'
  );
}

async function dispatch({ to, subject, html, logLabel, log }) {
  assertMailerConfigured();
  if (getBrevoApiKey()) {
    const info = await sendViaBrevoApi({ to, subject, html });
    if (log) {
      console.log(logLabel, {
        provider: info.provider,
        to,
        messageId: info.data && info.data.messageId
      });
    }
    return info;
  }
  const info = await transporter.sendMail({ from: resolveSender(), to, subject, html });
  if (log) {
    console.log(logLabel, {
      provider: 'smtp',
      to,
      messageId: info && info.messageId,
      accepted: info && info.accepted,
      rejected: info && info.rejected,
      response: info && info.response
    });
  }
  return info;
}

function getPlansFromEnv() {
  const raw = process.env.REG_PLANS || '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function inviteTemplate(link) {
  return `
  <div style="font-family: Arial; background:#0f172a; padding:40px; color:#fff; text-align:center;">
    <h1 style="color:#38bdf8;">Você foi convidado 🚀</h1>
    <p>Recebemos um pedido para criar sua conta.</p>
    <a href="${link}"
       style="display:inline-block; margin-top:20px; padding:15px 30px; background:#22c55e; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">
       Criar minha conta
    </a>
    <p style="margin-top:30px; font-size:12px; color:#94a3b8;">
      Esse link expira em 24 horas
    </p>
  </div>
  `;
}

function codeTemplate(code) {
  return `
  <div style="font-family: Arial; background:#020617; padding:40px; color:#fff; text-align:center;">
    <h2 style="color:#facc15;">Código de verificação</h2>
    <div style="font-size:40px; font-weight:bold; letter-spacing:8px; margin:20px 0;">
      ${code}
    </div>
    <p>Esse código expira em 10 minutos</p>
    <p style="font-size:12px; color:#64748b;">
      Se você não solicitou, ignore este email.
    </p>
  </div>
  `;
}

function resetPasswordTemplate(link, code) {
  return `
  <div style="font-family: Inter, Arial; background:#0b0b0f; padding:48px 24px; color:#e5e7eb;">
    <div style="max-width:600px;margin:0 auto;background:#11121a;border:1px solid #1f2335;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 28px 0;">
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#c084fc;">Redefinição de Senha</h1>
        <p style="margin:12px 0 0;color:#9ca3af;">Recebemos uma solicitação para redefinir sua senha.</p>
      </div>
      <div style="padding:24px 28px;">
        <a href="${link}"
           style="display:inline-block;padding:14px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">
           Redefinir Senha
        </a>
        <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Ou utilize este código manualmente na página:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:6px;margin:10px 0 0;color:#e5e7eb;">${code}</div>
        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">O código expira em 1 hora.</p>
        <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">Se não foi você, ignore este email.</p>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#7c3aed,#a78bfa);"></div>
    </div>
  </div>
  `;
}

async function sendInviteEmail(email, token, opts = {}) {
  assertMailerConfigured();
  const base = process.env.APP_PUBLIC_URL || 'https://www.beatwap.com.br';
  const envUseQuery = String(process.env.INVITE_LINK_STYLE || '').toLowerCase() === 'query';
  const roleRaw = opts.role ? String(opts.role).trim() : '';
  const roleLower = roleRaw.toLowerCase();
  const forceToken =
    opts.forceToken === true ||
    roleLower === 'produtor' ||
    roleLower === 'vendedor';
  const useQuery = !forceToken && envUseQuery;
  let link;
  if (useQuery) {
    const role = opts.role || process.env.REG_ROLE || 'Artista';
    // Plano: usa opts.plano, senão REG_PLANO (fallback), validando contra REG_PLANS se definido
    const allowed = getPlansFromEnv();
    let plano = opts.plano || process.env.REG_PLANO || 'Sem Plano';
    if (allowed.length > 0 && !allowed.includes(plano)) {
      plano = allowed[0];
    }
    const name = (() => {
      if (opts.name && String(opts.name).trim()) return String(opts.name).trim();
      const local = String(email).split('@')[0] || '';
      return local
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    })();
    const params = new URLSearchParams({
      name,
      email,
      role,
      plano,
      p_chat: opts.p_chat != null ? String(+!!opts.p_chat) : '1',
      p_musics: opts.p_musics != null ? String(+!!opts.p_musics) : '1',
      p_work: opts.p_work != null ? String(+!!opts.p_work) : '1',
      p_marketing: opts.p_marketing != null ? String(+!!opts.p_marketing) : '1',
      p_finance: opts.p_finance != null ? String(+!!opts.p_finance) : '1'
    });
    link = `${base}/register?${params.toString()}`;
  } else {
    link = `${base}/register/invite?token=${encodeURIComponent(String(token || '').trim())}`;
  }
  const info = await dispatch({
    to: email,
    subject: 'Convite para cadastro',
    html: inviteTemplate(link),
    logLabel: 'invite-email',
    log: true
  });
  return info;
}

async function sendCodeEmail(email, code) {
  return dispatch({
    to: email,
    subject: 'Seu código de verificação',
    html: codeTemplate(code),
    logLabel: 'code-email',
    log: true
  });
}

async function sendPasswordResetEmail(email, link, code) {
  return dispatch({
    to: email,
    subject: 'Redefinição de Senha',
    html: resetPasswordTemplate(link, code),
    logLabel: 'reset-email',
    log: true
  });
}

module.exports = {
  transporter,
  assertMailerConfigured,
  MailerConfigError,
  sendInviteEmail,
  sendCodeEmail,
  sendPasswordResetEmail
};