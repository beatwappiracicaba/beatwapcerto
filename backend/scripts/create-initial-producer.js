try {
  require('dotenv').config();
} catch {
  void 0;
}
const bcrypt = require('bcryptjs');
const { Profile, sequelize } = require('../src/models');

function readArg(flag) {
  const prefix = `${flag}=`;
  const hit = process.argv.find((arg) => String(arg).startsWith(prefix));
  return hit ? String(hit).slice(prefix.length).trim() : '';
}

function getInput(name, envKey) {
  const cliValue = readArg(`--${name}`);
  if (cliValue) return cliValue;
  return String(process.env[envKey] || '').trim();
}

(async () => {
  try {
    const email = getInput('email', 'INITIAL_PRODUCER_EMAIL').toLowerCase();
    const password = getInput('password', 'INITIAL_PRODUCER_PASSWORD');
    const nome = getInput('name', 'INITIAL_PRODUCER_NAME') || 'Produtor Inicial';

    if (!email || !password) {
      console.error('Uso: node scripts/create-initial-producer.js --email=voce@dominio.com --password=SuaSenhaForte --name="Seu Nome"');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('A senha precisa ter pelo menos 8 caracteres.');
      process.exit(1);
    }

    await sequelize.authenticate();
    await sequelize.sync();

    const existing = await Profile.findOne({ where: { email } });
    if (existing) {
      console.error('Ja existe um usuario com esse email.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await Profile.create({
      email,
      password_hash: hash,
      cargo: 'Produtor',
      nome
    });

    console.log(`Produtor inicial criado com sucesso: ${user.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Falha ao criar produtor inicial:', error);
    process.exit(1);
  }
})();
