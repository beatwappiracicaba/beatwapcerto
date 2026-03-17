const { sequelize } = require('../config/database');
const { Profile } = require('./Profile');
const { Invite } = require('./Invite');

module.exports = {
  sequelize,
  Profile,
  Invite
};
