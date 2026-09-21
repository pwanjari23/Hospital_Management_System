import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import corsOptions from './config/cors.js';
import apiRouter from './routes/index.js';
import notFoundHandler from './middleware/notFound.middleware.js';
import errorHandler from './middleware/error.middleware.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing with strict allowlist
app.use(cors(corsOptions));

// HTTP request logger
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request body parsers with size limit protection
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// API Root Routes
app.use('/api', apiRouter);

// Catch-all 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
