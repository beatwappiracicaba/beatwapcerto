const { Invite } = require('../src/models');

(async () => {
  try {
    const n = await Invite.destroy({ where: {} });
    console.log(`${n} convites apagados.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();