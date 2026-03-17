const { sequelize } = require('../config/database');
const { Profile } = require('./Profile');
const { Invite } = require('./Invite');
const { AuditLog } = require('./AuditLog');

module.exports = {
  sequelize,
  Profile,
  Invite,
  AuditLog
};
