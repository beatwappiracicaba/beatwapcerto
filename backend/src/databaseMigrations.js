const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('./models');

const MIGRATIONS = [
  {
    name: '001-initial-schema-sync',
    up: async () => {
      await sequelize.sync();
    }
  },
  {
    name: '002-profiles-reset-columns',
    up: async () => {
      const queryInterface = sequelize.getQueryInterface();
      let columns = {};
      try {
        columns = await queryInterface.describeTable('profiles');
      } catch {
        columns = {};
      }

      if (!columns.reset_code) {
        await queryInterface.addColumn('profiles', 'reset_code', {
          type: DataTypes.TEXT,
          allowNull: true
        });
      }

      if (!columns.reset_expires) {
        await queryInterface.addColumn('profiles', 'reset_expires', {
          type: DataTypes.DATE,
          allowNull: true
        });
      }
    }
  },
  {
    name: '003-events-and-tickets',
    up: async () => {
      const queryInterface = sequelize.getQueryInterface();
      let eventColumns = {};
      let ticketColumns = {};
      try {
        eventColumns = await queryInterface.describeTable('events');
      } catch {
        eventColumns = {};
      }
      try {
        ticketColumns = await queryInterface.describeTable('event_tickets');
      } catch {
        ticketColumns = {};
      }

      if (!Object.keys(eventColumns).length) {
        await queryInterface.createTable('events', {
          id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
          created_by: { type: DataTypes.UUID, allowNull: true },
          slug: { type: DataTypes.STRING, allowNull: false, unique: true },
          title: { type: DataTypes.STRING, allowNull: false },
          subtitle: { type: DataTypes.STRING, allowNull: true },
          description: { type: DataTypes.TEXT, allowNull: true },
          banner_url: { type: DataTypes.TEXT, allowNull: true },
          venue_name: { type: DataTypes.STRING, allowNull: false },
          venue_city: { type: DataTypes.STRING, allowNull: true },
          venue_address: { type: DataTypes.STRING, allowNull: true },
          starts_at: { type: DataTypes.DATE, allowNull: false },
          sales_ends_at: { type: DataTypes.DATE, allowNull: true },
          published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          contact_phone: { type: DataTypes.STRING, allowNull: true },
          ticket_types: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
          settings: { type: DataTypes.JSON, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
      }

      if (!Object.keys(ticketColumns).length) {
        await queryInterface.createTable('event_tickets', {
          id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
          event_id: { type: DataTypes.UUID, allowNull: false },
          order_id: { type: DataTypes.UUID, allowNull: false },
          buyer_name: { type: DataTypes.STRING, allowNull: false },
          buyer_email: { type: DataTypes.STRING, allowNull: false },
          buyer_phone: { type: DataTypes.STRING, allowNull: true },
          ticket_type_id: { type: DataTypes.STRING, allowNull: false },
          ticket_type_name: { type: DataTypes.STRING, allowNull: false },
          unit_price_cents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          invite_code: { type: DataTypes.STRING, allowNull: false, unique: true },
          qr_token: { type: DataTypes.STRING, allowNull: false, unique: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'issued' },
          checked_in_at: { type: DataTypes.DATE, allowNull: true },
          checked_in_by: { type: DataTypes.UUID, allowNull: true },
          metadata_json: { type: DataTypes.JSON, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
      }
    }
  },
  {
    name: '004-payment-orders-metadata-json',
    up: async () => {
      const queryInterface = sequelize.getQueryInterface();
      let columns = {};
      try {
        columns = await queryInterface.describeTable('payment_orders');
      } catch {
        columns = {};
      }

      if (!columns.metadata_json) {
        await queryInterface.addColumn('payment_orders', 'metadata_json', {
          type: DataTypes.JSON,
          allowNull: true
        });
      }
    }
  }
];

async function ensureMigrationTable() {
  const queryInterface = sequelize.getQueryInterface();
  try {
    await queryInterface.describeTable('schema_migrations');
    return;
  } catch {
    void 0;
  }

  await queryInterface.createTable('schema_migrations', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    run_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });
}

async function getAppliedMigrationNames() {
  await ensureMigrationTable();
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations ORDER BY name ASC');
  return new Set((Array.isArray(rows) ? rows : []).map((row) => String(row.name)));
}

async function markMigrationAsApplied(name) {
  await sequelize.query(
    'INSERT INTO schema_migrations (name, run_at) VALUES (:name, CURRENT_TIMESTAMP)',
    { replacements: { name } }
  );
}

async function getPendingMigrations() {
  const applied = await getAppliedMigrationNames();
  return MIGRATIONS.filter((migration) => !applied.has(migration.name));
}

async function runPendingMigrations(logger = console) {
  await sequelize.authenticate();
  const pending = await getPendingMigrations();

  if (!pending.length) {
    logger.log('Nenhuma migration pendente.');
    return [];
  }

  const appliedNames = [];
  for (const migration of pending) {
    logger.log(`Aplicando migration ${migration.name}...`);
    await migration.up();
    await markMigrationAsApplied(migration.name);
    appliedNames.push(migration.name);
  }

  logger.log(`Migrations aplicadas: ${appliedNames.join(', ')}`);
  return appliedNames;
}

async function verifyDatabaseReady() {
  await sequelize.authenticate();
  const pending = await getPendingMigrations();
  if (pending.length) {
    const names = pending.map((migration) => migration.name).join(', ');
    throw new Error(
      `Existem migrations pendentes (${names}). Execute "npm run db:migrate" antes de iniciar o servidor.`
    );
  }
}

module.exports = {
  runPendingMigrations,
  verifyDatabaseReady
};
