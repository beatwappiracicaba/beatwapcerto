exports.getAll = async (req, res) => {
  // Lógica para buscar todos os eventos
  res.status(200).send('Events endpoint');
};

exports.create = async (req, res) => {
  // Lógica para criar um evento
  res.status(200).send('Create event endpoint');
};
