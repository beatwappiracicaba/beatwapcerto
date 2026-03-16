require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Profile, sequelize } = require('../src/models');

(async () => {
  try {
    await sequelize.sync();
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const commonHash = await bcrypt.hash('Senha123!', 10);

    await Profile.upsert({ email: 'admin@beatwap.com.br', password_hash: adminHash, cargo: 'Produtor', nome: 'Admin' });
    await Profile.upsert({ email: 'artist@beatwap.com.br', password_hash: commonHash, cargo: 'Artista', nome: 'Artista Demo' });
    await Profile.upsert({ email: 'composer@beatwap.com.br', password_hash: commonHash, cargo: 'Compositor', nome: 'Compositor Demo' });
    await Profile.upsert({ email: 'seller@beatwap.com.br', password_hash: commonHash, cargo: 'Vendedor', nome: 'Vendedor Demo' });
    console.log('Seed completed');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
