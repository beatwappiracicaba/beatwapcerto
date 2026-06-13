const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const EventTicket = sequelize.define('EventTicket', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  event_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  buyer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  buyer_email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  buyer_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ticket_type_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ticket_type_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit_price_cents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  invite_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  qr_token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'issued'
  },
  checked_in_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checked_in_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  metadata_json: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'event_tickets'
});

module.exports = { EventTicket };
