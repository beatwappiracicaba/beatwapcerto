import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { songsRouter } from './routes/songs.js';
import { messagesRouter } from './routes/messages.js';
import { homeRouter } from './routes/home.js';

dotenv.config();

const app = express();
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/', authRouter);
app.use('/', profileRouter);
app.use('/', songsRouter);
app.use('/', messagesRouter);
app.use('/', homeRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
