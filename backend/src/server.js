const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { sequelize, Profile } = require('./models');

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ ok: true, db: true });
  } catch {
    return res.json({ ok: true, db: false });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/public'));
app.use('/api', require('./routes/dashboard'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/upload'));

const port = Number(process.env.PORT || 3011);
app.listen(port, async () => {
  try {
    await sequelize.sync();
    // Seed default users if missing
    async function seedUser(email, password, cargo, nome) {
      const existing = await Profile.findOne({ where: { email } });
      if (existing) return existing;
      const hash = await bcrypt.hash(password, 10);
      return await Profile.create({ email, password_hash: hash, cargo, nome });
    }
    await seedUser('admin@beatwap.local', 'admin123', 'Produtor', 'Admin Produtor');
    await seedUser('artista@beatwap.local', 'artista123', 'Artista', 'Artista Demo');
    await seedUser('vendedor@beatwap.local', 'vendedor123', 'Vendedor', 'Vendedor Demo');
    await seedUser('compositor@beatwap.local', 'compositor123', 'Compositor', 'Compositor Demo');
    if (String(process.env.NODE_ENV).toLowerCase() === 'development') {
      const demoEmailsToRemove = [
        'admin@beatwap.com.br',
        'artist@beatwap.com.br',
        'composer@beatwap.com.br',
        'seller@beatwap.com.br'
      ];
      await Profile.destroy({ where: { email: demoEmailsToRemove } }).catch(() => {});
    }
    console.log(`API listening on ${port}`);
  } catch (e) {
    console.error('DB init failed', e);
  }
});
