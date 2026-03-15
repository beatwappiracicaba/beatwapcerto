const bcrypt = require('bcryptjs');
const { Profile, Sponsor, sequelize } = require('../src/models');

(async () => {
  await sequelize.authenticate();
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const commonHash = await bcrypt.hash('Senha123!', 10);

  await Profile.upsert({ email: 'admin@beatwap.com.br', password_hash: adminHash, cargo: 'Produtor', nome: 'Admin' });
  await Profile.upsert({ email: 'artist@beatwap.com.br', password_hash: commonHash, cargo: 'Artista', nome: 'Artista Demo' });
  await Profile.upsert({ email: 'seller@beatwap.com.br', password_hash: commonHash, cargo: 'Vendedor', nome: 'Vendedor Demo' });
  await Profile.upsert({ email: 'composer@beatwap.com.br', password_hash: commonHash, cargo: 'Compositor', nome: 'Compositor Demo' });

  await Sponsor.findOrCreate({ where: { name: 'Patrocinador Demo' }, defaults: { active: true } });

  console.log('Seed completed');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
