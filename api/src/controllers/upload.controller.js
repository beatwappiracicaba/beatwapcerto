const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Por favor, envie um arquivo.' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  res.status(200).send({
    message: 'Arquivo enviado com sucesso!',
    file: req.file,
    url: fileUrl,
  });
};

module.exports = {
  upload: upload.single('file'),
  uploadFile,
};
