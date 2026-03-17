const crypto = require('crypto');
const { Invite } = require('../src/models');
const { sendInviteEmail } = require('../src/services/mailer');

(async () => {
  const email = process.argv[2];
  const plano = process.argv[3]; // opcional: plano explícito
  if (!email) {
    console.log('Uso: node scripts/test-invite.js <email> [plano]');
    process.exit(1);
  }
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Invite.create({
      email,
      token,
      expires_at: expires,
      used: false,
      created_by: null
    });
    const info = await sendInviteEmail(email, token, { plano });
    console.log(`Convite enviado para ${email} (${plano || 'plano padrão'})`);
  } catch (e) {
    console.error('Erro ao enviar:', e);
    process.exit(1);
  }
})();
