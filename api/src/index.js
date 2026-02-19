import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './auth/auth.routes.js';
import { profileRouter } from './routes/profile.js';
import { profilesRouter } from './routes/profiles.js';
import { songsRouter } from './routes/songs.js';
import { messagesRouter } from './routes/messages.js';
import { homeRouter } from './routes/home.js';
import { workRouter } from './routes/work.js';
import { financeRouter } from './routes/finance.js';
import { notificationsRouter } from './routes/notifications.js';
import { aiRouter } from './routes/ai.js';
import { proposalsRouter } from './routes/proposals.js';
import { compositionsRouter } from './routes/compositions.js';
import { adminSellersRouter } from './routes/adminSellers.js';
import { sellerRouter } from './routes/seller.js';

dotenv.config();

const app = express();
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/health/db', async (_req, res) => {
  try {
    const r = await (await import('./db.js')).query('select 1 as ok', []);
    return res.json({ db: r.rows[0]?.ok === 1 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ db: false, error: 'DB connection failed' });
  }
});

app.use('/', authRouter);
app.use('/', profileRouter);
app.use('/', profilesRouter);
app.use('/', songsRouter);
app.use('/', messagesRouter);
app.use('/', homeRouter);
app.use('/', workRouter);
app.use('/', financeRouter);
app.use('/', notificationsRouter);
app.use('/', compositionsRouter);
app.use('/', proposalsRouter);
app.use('/', aiRouter);
app.use('/', adminSellersRouter);
app.use('/', sellerRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
