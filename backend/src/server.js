const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const sellerRoutes = require('./routes/seller');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true, db: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

const port = Number(process.env.PORT || 3000);
sequelize.sync().then(() => {
  app.listen(port, () => {
    process.stdout.write(`API listening on ${port}\n`);
  });
});
