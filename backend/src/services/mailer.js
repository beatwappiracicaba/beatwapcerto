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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Deriva um nome legivel a partir do email quando o convite nao tem nome salvo.
function displayNameFromEmail(email) {
  const local = String(email || '').split('@')[0] || '';
  const parts = local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (!parts.length) return '';
  return parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1).join('')).join(' ');
}

const GOLD = '#F5C542';
const INK = '#0B0B0B';
const SURFACE = '#141414';
const LINE = 'rgba(245,197,66,0.18)';

function inviteTemplate(link, opts = {}) {
  const safeLink = escapeHtml(link);
  const safeName = escapeHtml(opts.name);
  const rawRole = String(opts.role || '').trim();
  const safeRole = escapeHtml(rawRole);
  const rawSite = String(opts.site || '').trim();
  const safeSite = escapeHtml(rawSite);
  const safeLogo = escapeHtml(opts.logoUrl || '');
  const ttlHours = Math.max(1, Math.round(Number(opts.ttlHours) || 24));

  const greeting = safeName ? `Olá, ${safeName}!` : 'Olá!';
  const roleLine = rawRole
    ? `Seu convite para fazer parte da <strong style="color:${GOLD};">BeatWap como ${safeRole}</strong> está esperando por você.`
    : 'Seu convite para fazer parte da <strong style="color:' + GOLD + ';">BeatWap</strong> está esperando por você.';

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="v" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Você foi convidado para a BeatWap</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
  a{color:${GOLD};}
  @media only screen and (max-width:620px){
    .bw-pad{padding-left:22px !important;padding-right:22px !important;}
    .bw-h1{font-size:26px !important;line-height:32px !important;}
    .bw-btn{width:100% !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${INK};word-spacing:normal;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Você foi convidado para fazer parte da BeatWap. Aceite o convite e crie seu acesso.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${INK};">
  <tr>
    <td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

        <tr>
          <td align="center" class="bw-pad" style="padding:8px 40px 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                ${safeLogo ? `<td align="center" style="padding-right:14px;"><img src="${safeLogo}" width="76" alt="BeatWap" style="display:block;width:76px;max-width:76px;height:auto;"></td>` : ''}
                <td align="center">
                  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:30px;line-height:34px;font-weight:800;letter-spacing:2px;color:#FFFFFF;"><span style="color:${GOLD};">BEAT</span>WAP</div>
                  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;line-height:14px;letter-spacing:3.4px;text-transform:uppercase;color:rgba(245,245,247,0.5);padding-top:4px;">Conectando talentos e música</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="bw-pad" style="padding:0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SURFACE};border:1px solid ${LINE};border-radius:20px;">

              <tr>
                <td align="center" style="padding:44px 34px 8px;">
                  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;letter-spacing:2.6px;text-transform:uppercase;color:${GOLD};">Convite oficial</div>
                </td>
              </tr>

              <tr>
                <td align="center" class="bw-pad" style="padding:6px 34px 0;">
                  <h1 class="bw-h1" style="margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:32px;line-height:40px;font-weight:800;color:#FFFFFF;">🎉 Você foi convidado!</h1>
                </td>
              </tr>

              <tr>
                <td align="center" class="bw-pad" style="padding:14px 34px 0;">
                  <p style="margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:rgba(245,245,247,0.72);">A música conecta pessoas, talentos e oportunidades. Agora você também faz parte dessa conexão.</p>
                </td>
              </tr>

              <tr>
                <td class="bw-pad" style="padding:26px 34px 0;">
                  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:26px;color:rgba(245,245,247,0.78);">
                    <p style="margin:0 0 14px;">${greeting}</p>
                    <p style="margin:0 0 14px;">É um prazer ter você por aqui. Você recebeu um convite para fazer parte da <strong style="color:#F5F5F7;">BeatWap</strong>, uma plataforma criada para conectar artistas, produtores, compositores e profissionais da música.</p>
                    <p style="margin:0;">${roleLine}</p>
                  </div>
                </td>
              </tr>

              <tr>
                <td align="center" class="bw-pad" style="padding:30px 34px 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="50%" stroke="f" fillcolor="${GOLD}">
                    <w:anchorlock/>
                    <center style="color:${INK};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;letter-spacing:0.6px;">ACEITAR MEU CONVITE</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <a class="bw-btn" href="${link}" target="_blank" rel="noopener" style="display:inline-block;width:320px;max-width:100%;padding:17px 26px;background-color:${GOLD};color:${INK};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;letter-spacing:0.6px;text-decoration:none;border-radius:999px;">ACEITAR MEU CONVITE</a>
                  <!--<![endif]-->
                </td>
              </tr>

              <tr>
                <td align="center" class="bw-pad" style="padding:16px 34px 0;">
                  <p style="margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:rgba(245,245,247,0.6);">Seu acesso está a um clique de distância. Esperamos você dentro da BeatWap.</p>
                </td>
              </tr>

              <tr>
                <td class="bw-pad" style="padding:30px 34px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <p style="margin:0 0 10px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:rgba(245,245,247,0.62);">Se o botão acima não funcionar, copie e cole este endereço no navegador:</p>
                        <p style="margin:0;font-family:'Segoe UI',Menlo,Consolas,monospace;font-size:12px;line-height:20px;color:${GOLD};word-break:break-all;overflow-wrap:anywhere;">${safeLink}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td class="bw-pad" style="padding:26px 34px 34px;">
                  <p style="margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:22px;color:rgba(245,245,247,0.5);">Este convite é válido por ${ttlHours} ${ttlHours === 1 ? 'hora' : 'horas'}.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <tr>
          <td class="bw-pad" align="center" style="padding:24px 40px 6px;">
            <p style="margin:0 0 10px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:22px;color:rgba(245,245,247,0.55);">Não reconhece este convite ou não deseja participar? Sem problema. Você pode simplesmente ignorar este e-mail. Nenhuma ação é necessária.</p>
          </td>
        </tr>

        <tr>
          <td align="center" class="bw-pad" style="padding:22px 40px 34px;">
            <div style="height:1px;line-height:1px;font-size:0;background-color:${LINE};">&nbsp;</div>
            <p style="margin:18px 0 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:rgba(245,245,247,0.55);">© BeatWap</p>
            <p style="margin:6px 0 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(245,245,247,0.38);">Conectando talentos, música e oportunidades.${rawSite ? `<br><a href="${safeSite}" target="_blank" rel="noopener" style="color:${GOLD};text-decoration:none;">${safeSite}</a>` : ''}</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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
  // Nome exibido no e-mail. O mesmo valor continua sendo usado no link de
  // query abaixo, entao a geracao do link permanece identica.
  const name = (() => {
    if (opts.name && String(opts.name).trim()) return String(opts.name).trim();
    return displayNameFromEmail(email);
  })();
  let link;
  if (useQuery) {
    const role = opts.role || process.env.REG_ROLE || 'Artista';
    // Plano: usa opts.plano, senão REG_PLANO (fallback), validando contra REG_PLANS se definido
    const allowed = getPlansFromEnv();
    let plano = opts.plano || process.env.REG_PLANO || 'Sem Plano';
    if (allowed.length > 0 && !allowed.includes(plano)) {
      plano = allowed[0];
    }
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
    subject: '🎉 Você foi convidado para a BeatWap',
    html: inviteTemplate(link, {
      name,
      role: roleRaw,
      site: base,
      logoUrl: process.env.INVITE_LOGO_URL || `${base}/icons/icon-192x192.png`,
      ttlHours: Number(process.env.INVITE_TTL_HOURS || 24)
    }),
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