const { sequelize } = require('../src/models');

(async () => {
  await sequelize.sync({ alter: true });
  console.log('Migrations applied');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
