import path from 'path';
import { fileURLToPath } from 'url';
import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../../');

export const migrator = new Umzug({
  migrations: {
    glob: 'src/database/migrations/*.js',
    resolve: ({ name, path: filepath, context }) => {
      return {
        name,
        up: async () => {
          const migration = await import(`file://${path.resolve(serverRoot, filepath)}`);
          return migration.up(context, sequelize.Sequelize);
        },
        down: async () => {
          const migration = await import(`file://${path.resolve(serverRoot, filepath)}`);
          return migration.down(context, sequelize.Sequelize);
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
  logger: console,
});

export const seeder = new Umzug({
  migrations: {
    glob: 'src/database/seeders/*.js',
    resolve: ({ name, path: filepath, context }) => {
      return {
        name,
        up: async () => {
          const seederModule = await import(`file://${path.resolve(serverRoot, filepath)}`);
          return seederModule.up(context, sequelize.Sequelize);
        },
        down: async () => {
          const seederModule = await import(`file://${path.resolve(serverRoot, filepath)}`);
          return seederModule.down(context, sequelize.Sequelize);
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeData' }),
  logger: console,
});

// CLI Runner execution
const run = async () => {
  const command = process.argv[2] || 'up';

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        console.log('Running migrations...');
        await migrator.up();
        console.log('✓ All migrations applied successfully.');
        break;

      case 'down':
      case 'migrate:undo':
        console.log('Reverting last migration...');
        await migrator.down();
        console.log('✓ Migration reverted.');
        break;

      case 'seed':
        console.log('Running seeders...');
        await seeder.up();
        console.log('✓ Seeders executed successfully.');
        break;

      case 'seed:undo':
        console.log('Reverting last seeder...');
        await seeder.down();
        console.log('✓ Seeder reverted.');
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: up, down, seed, seed:undo');
        process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error(`✗ Operation failed: ${error.message}`);
    process.exit(1);
  }
};

// Execute if run directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
