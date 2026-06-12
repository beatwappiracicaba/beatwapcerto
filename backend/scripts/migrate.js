require('dotenv').config();
const { runPendingMigrations } = require('../src/databaseMigrations');

(async () => {
  try {
    await runPendingMigrations(console);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
