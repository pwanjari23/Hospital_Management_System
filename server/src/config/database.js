import { Sequelize } from 'sequelize';
import env from './env.js';

export const sequelize = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: 'postgres',
    logging: env.isDevelopment ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

/**
 * Validates the database connection using sequelize.authenticate().
 * Does not expose passwords or sensitive credentials in error logs.
 */
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error(
      `✗ Failed to connect to PostgreSQL database '${env.database.name}' on ${env.database.host}:${env.database.port}.`
    );
    console.error(`  Reason: ${error.message}`);
    throw error;
  }
};

export default sequelize;
