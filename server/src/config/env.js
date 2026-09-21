import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredVariables = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'CLIENT_URL'];

const missingVariables = requiredVariables.filter((varName) => {
  const value = process.env[varName];
  return value === undefined || value.trim() === '';
});

if (missingVariables.length > 0) {
  console.error('\n' + '='.repeat(60));
  console.error(
    `Startup Error: Missing required environment variable(s): ${missingVariables.join(', ')}.\n` +
      `Please set these variables in server/.env (refer to server/.env.example).`
  );
  console.error('='.repeat(60) + '\n');
  process.exit(1);
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  },
  clientUrl: process.env.CLIENT_URL,
});

export default env;
