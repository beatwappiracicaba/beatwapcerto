const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: true, // Aceita qualquer origem temporariamente
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth.routes');
const homeRoutes = require('./routes/home.routes');
// const uploadRoutes = require('./routes/upload.routes');
const eventRoutes = require('./routes/events.routes');
const producerRoutes = require('./routes/producers.routes');
const profilesRoutes = require('./routes/profiles.routes');
const releasesRoutes = require('./routes/releases.routes');
const compositionsRoutes = require('./routes/compositions.routes');
const projectsRoutes = require('./routes/projects.routes');
const sponsorsRoutes = require('./routes/sponsors.routes');
// const { upload, uploadFile } = require('./controllers/upload.controller');

// app.post('/upload', upload.single('file'), uploadFile);

app.use('/auth', authRoutes);
console.log('Auth routes registradas');
app.use('/home', homeRoutes);
console.log('Home routes registradas');
// app.use('/upload', uploadRoutes);
app.use('/events', eventRoutes);
console.log('Event routes registradas');
app.use('/producers', producerRoutes);
console.log('Producer routes registradas');
app.use('/profiles', profilesRoutes);
console.log('Profiles routes registradas');
app.use('/releases', releasesRoutes);
console.log('Releases routes registradas');
app.use('/compositions', compositionsRoutes);
console.log('Compositions routes registradas');
app.use('/projects', projectsRoutes);
console.log('Projects routes registradas');
app.use('/sponsors', sponsorsRoutes);
console.log('Sponsors routes registradas');

app.get('/', (req, res) => {
  res.send('API da Beatwap está no ar!');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
