const { Invite } = require('../src/models');
const { sendInviteEmail } = require('../src/services/mailer');

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.log('Uso: node scripts/test-invite.js <email>');
    process.exit(1);
  }
  try {
    const token = Invite.generateToken();
    await sendInviteEmail(email, token);
    console.log(`Convite enviado para ${email}`);
  } catch (e) {
    console.error('Erro ao enviar:', e);
    process.exit(1);
  }
})();