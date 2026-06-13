const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  banner_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  venue_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  venue_city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  venue_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  starts_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  sales_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  published: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  contact_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ticket_types: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'events'
});

module.exports = { Event };
