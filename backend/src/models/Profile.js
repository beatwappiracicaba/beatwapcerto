const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cargo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ativo', 'pendente', 'bloqueado'),
    allowNull: true,
    defaultValue: 'ativo'
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nome_completo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  razao_social: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cpf: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cnpj: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  genero_musical: {
    type: DataTypes.STRING,
    allowNull: true
  },
  youtube_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  spotify_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deezer_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tiktok_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  instagram_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  site_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nome_completo_razao_social: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cpf_cnpj: {
    type: DataTypes.STRING,
    allowNull: true
  },
  celular: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tema: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cep: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logradouro: {
    type: DataTypes.STRING,
    allowNull: true
  },
  complemento: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bairro: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cidade: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: true
  },
  plano: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  creditos_envio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  creditos_hit_semana: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  bonus_quota: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  plan_started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  referred_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  contract_accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  access_control: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'profiles'
});

module.exports = { Profile };
