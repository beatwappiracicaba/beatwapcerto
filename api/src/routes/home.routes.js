const express = require('express');
const router = express.Router();

// Rotas para a página inicial - todas as categorias
router.get('/releases', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/compositions', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/projects', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/sponsors', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/composers', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/producers', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/sellers', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

router.get('/artists', (req, res) => {
  res.json([]); // Retorna array vazio por enquanto
});

module.exports = router;