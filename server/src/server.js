import app from './app.js';
import env from './config/env.js';
import { testConnection } from './config/database.js';

const startServer = async () => {
  try {
    console.log('\n--- Initializing Hospital Management System (HMS) Server ---');
    console.log(`Environment: ${env.nodeEnv}`);

    // Step 1: Validate Database Connection
    console.log('Connecting to PostgreSQL database...');
    await testConnection();

    // Step 2: Start HTTP Server
    const server = app.listen(env.port, () => {
      console.log(`✓ HMS Server successfully running at http://localhost:${env.port}`);
      console.log(`✓ Health endpoint available at http://localhost:${env.port}/api/health\n`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('\n✗ Server failed to start due to database connection failure:');
    console.error(`  ${error.message}`);
    console.error(
      '  Please ensure PostgreSQL is running and credentials in server/.env are valid.\n'
    );
    process.exit(1);
  }
};

startServer();
