const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.warn('SMTP_USER/SMTP_PASS not set. Email sending will fail.');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

const transporter = createTransport();

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

async function sendInviteEmail(email, token) {
  const base = process.env.APP_PUBLIC_URL || 'https://www.beatwap.com.br';
  const link = `${base}/register/invite?token=${token}`;
  return transporter.sendMail({
    to: email,
    subject: 'Convite para cadastro',
    html: inviteTemplate(link)
  });
}

async function sendCodeEmail(email, code) {
  return transporter.sendMail({
    to: email,
    subject: 'Seu código de verificação',
    html: codeTemplate(code)
  });
}

module.exports = {
  transporter,
  sendInviteEmail,
  sendCodeEmail
};
