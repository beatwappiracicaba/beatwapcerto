const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Audition = sequelize.define('Audition', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  },
  nome_artista: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nome_produtor: {
    type: DataTypes.STRING,
    allowNull: false
  },
  foto_artista_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estilo_musical_principal: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estilos_semelhantes: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  referencias_musicais: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  descricao_detalhada: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tema: {
    type: DataTypes.STRING,
    allowNull: false
  },
  faixa_etaria_publico: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cidade_estado: {
    type: DataTypes.STRING,
    allowNull: false
  },
  valor_negociacao: {
    type: DataTypes.STRING,
    allowNull: true
  },
  prazo_envio: {
    type: DataTypes.DATE,
    allowNull: false
  },
  whatsapp_recebimento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  observacoes_adicionais: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Aberta'
  },
  encerrada_em: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'auditions',
  indexes: [
    { fields: ['created_by'] },
    { fields: ['status'] },
    { fields: ['prazo_envio'] }
  ]
});

module.exports = { Audition };
