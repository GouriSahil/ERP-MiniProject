import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import passport from './config/passport';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Configuration
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(morgan('dev')); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Initialize Passport
app.use(passport.initialize());

// API Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ERP Mini Project API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*'
    }
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 ERP API Server Running                               ║
║                                                           ║
║   📍 Port: ${PORT}                                      ║
║   🔗 Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   🌐 CORS: ${CORS_ORIGIN}                 ║
║                                                           ║
║   Available endpoints:                                    ║
║   - GET  /api/health                                      ║
║   - POST /api/auth/register                               ║
║   - POST /api/auth/login                                  ║
║   - POST /api/auth/refresh                                ║
║   - POST /api/auth/logout                                 ║
║   - GET  /api/auth/me                                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
