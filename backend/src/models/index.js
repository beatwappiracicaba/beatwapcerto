const { sequelize } = require('../config/database');
const { Profile } = require('./Profile');
const { Invite } = require('./Invite');
const { AuditLog } = require('./AuditLog');
const { PaymentOrder } = require('./PaymentOrder');
const { Audition } = require('./Audition');
const { AuditionSubmission } = require('./AuditionSubmission');
const { AppState } = require('./AppState');
const { Event } = require('./Event');
const { EventTicket } = require('./EventTicket');

module.exports = {
  sequelize,
  Profile,
  Invite,
  AuditLog,
  PaymentOrder,
  Audition,
  AuditionSubmission,
  AppState,
  Event,
  EventTicket
};
