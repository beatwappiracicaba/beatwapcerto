const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const eventRoutes = require('./routes/events.routes');
const producerRoutes = require('./routes/producers.routes');
const { upload, uploadFile } = require('./controllers/upload.controller');

app.post('/upload', upload.single('file'), uploadFile);

app.use('/auth', authRoutes);
// app.use('/upload', uploadRoutes);
app.use('/events', eventRoutes);
app.use('/producers', producerRoutes);

app.get('/', (req, res) => {
  res.send('API da Beatwap está no ar!');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
