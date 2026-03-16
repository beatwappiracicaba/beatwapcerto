const { Sequelize } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

let sequelize;
const dialect = String(process.env.DB_DIALECT || '').toLowerCase();
if (dialect === 'postgres' || dialect === 'pg') {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
      define: { underscored: true, timestamps: true }
    }
  );
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(process.cwd(), 'backend', 'database.sqlite'),
    logging: false,
    define: { underscored: true, timestamps: true }
  });
}

module.exports = { sequelize };
