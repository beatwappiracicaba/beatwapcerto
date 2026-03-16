require('dotenv').config();
const { sequelize } = require('../src/models');

(async () => {
  try {
    try {
      await sequelize.sync({ alter: true });
      console.log('Migrations applied (alter)');
      process.exit(0);
    } catch (e) {
      if (String(e?.name).includes('Sequelize') || String(e?.code).includes('SQLITE_CONSTRAINT')) {
        console.warn('Alter failed, forcing full sync...');
        await sequelize.sync({ force: true });
        console.log('Migrations applied (force)');
        process.exit(0);
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
