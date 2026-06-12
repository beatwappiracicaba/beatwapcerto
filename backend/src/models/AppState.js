const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppState = sequelize.define('AppState', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  payload_text: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'app_state'
});

module.exports = { AppState };
