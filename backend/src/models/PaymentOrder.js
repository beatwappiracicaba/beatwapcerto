const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const PaymentOrder = sequelize.define('PaymentOrder', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  profile_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'created'
  },
  product_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  product_key: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  amount_cents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'BRL'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  external_reference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  idempotency_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  mp_preference_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mp_payment_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mp_payment_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mp_payment_status_detail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mp_payment_method_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mp_payment_type_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mp_installments: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mp_live_mode: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  mp_raw: {
    type: DataTypes.JSON,
    allowNull: true
  },
  access_granted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payment_orders'
});

module.exports = { PaymentOrder };

