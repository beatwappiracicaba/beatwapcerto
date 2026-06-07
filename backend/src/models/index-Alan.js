const { sequelize } = require('../config/database');
const { Profile } = require('./Profile');
const { Invite } = require('./Invite');
const { AuditLog } = require('./AuditLog');
const { PaymentOrder } = require('./PaymentOrder');
const { Audition } = require('./Audition');
const { AuditionSubmission } = require('./AuditionSubmission');

module.exports = {
  sequelize,
  Profile,
  Invite,
  AuditLog,
  PaymentOrder,
  Audition,
  AuditionSubmission
};
