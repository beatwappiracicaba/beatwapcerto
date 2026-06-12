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
