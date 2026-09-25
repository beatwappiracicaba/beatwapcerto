try {
  require('dotenv').config();
} catch {
  void 0;
}
const bcrypt = require('bcryptjs');
const { Profile, sequelize } = require('../src/models');

// Contas ficticias para validar a tela de Gerenciar Permissoes por cargo.
// Idempotente: se o email ja existir, a conta e apenas reaproveitada.
const TEST_PASSWORD = process.env.TEST_USERS_PASSWORD || '@BW4907@BW';
const TEST_PLAN = process.env.TEST_USERS_PLAN || 'Mensal';

const USERS = [
  { cargo: 'Artista', nome: 'Artista Teste', email: 'teste.artista@beatwap.com.br' },
  { cargo: 'Compositor', nome: 'Compositor Teste', email: 'teste.compositor@beatwap.com.br' },
  { cargo: 'Vendedor', nome: 'Vendedor Teste', email: 'teste.vendedor@beatwap.com.br' }
];

(async () => {
  try {
    if (!TEST_PASSWORD || TEST_PASSWORD.length < 8) {
      console.error('A senha de teste precisa ter pelo menos 8 caracteres.');
      process.exit(1);
    }

    await sequelize.authenticate();
    await sequelize.sync();

    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    for (const user of USERS) {
      const existing = await Profile.findOne({ where: { email: user.email } });

      if (existing) {
        const [changed] = await Profile.update(
          { password_hash: hash, cargo: user.cargo, status: 'ativo', email_verified: true },
          { where: { id: existing.id } }
        );
        console.log(
          `atualizado: ${user.email} (${user.cargo})` + (changed ? '' : ' — sem alteracoes')
        );
        continue;
      }

      await Profile.create({
        email: user.email,
        password_hash: hash,
        cargo: user.cargo,
        nome: user.nome,
        status: 'ativo',
        email_verified: true,
        plano: TEST_PLAN,
        access_control: {}
      });
      console.log(`criado: ${user.email} (${user.cargo}, plano ${TEST_PLAN})`);
    }

    console.log('\nSenha dos tres: a mesma informada em TEST_USERS_PASSWORD');
    process.exit(0);
  } catch (error) {
    console.error('Falha ao criar usuarios de teste:', error);
    process.exit(1);
  }
})();
