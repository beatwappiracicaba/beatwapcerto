const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const AuditionSubmission = sequelize.define('AuditionSubmission', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  audition_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  composer_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  nome_musica: {
    type: DataTypes.STRING,
    allowNull: false
  },
  link_musica: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pendente'
  }
}, {
  tableName: 'audition_submissions',
  indexes: [
    { fields: ['audition_id'] },
    { fields: ['composer_id'] },
    { fields: ['audition_id', 'composer_id'] },
    { unique: true, fields: ['audition_id', 'composer_id', 'link_musica'] }
  ]
});

module.exports = { AuditionSubmission };
