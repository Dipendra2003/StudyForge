// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabases } from "./db/index";
import { initializeStorage } from "./storage";
import { errorHandler } from "./middleware/errorHandler";
import { validateEnvOrExit, logEnvironmentConfig } from "./config/validateEnv";
import { securityHeaders, additionalSecurityHeaders, securityLogging } from "./middleware/security.middleware";
import { setupCronJobs } from "./cron";

const app = express();

// Security headers middleware (must be early in the middleware chain)
// Requirements: 8.8
app.use(securityHeaders);
app.use(additionalSecurityHeaders);
app.use(securityLogging);

// Enable compression for all responses - significant performance boost
app.use(compression({
  level: 6, // Balanced compression level (0-9)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Increase JSON payload limit if needed, but keep reasonable for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Setup cookie-parser middleware for JWT authentication
app.use(cookieParser());

// Optimized request logging middleware - only log slow requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log API requests that take longer than 100ms or have errors
    if (path.startsWith("/api") && (duration > 100 || res.statusCode >= 400)) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

// Cross-origin resource sharing configuration
// Requirements: 8.8
import { CORS_CONFIG, isOriginAllowed } from "./config/security";

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // In development, be more permissive
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5000');
  }
  
  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', CORS_CONFIG.credentials.toString());
  res.setHeader('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString());
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Setup Gemini API key middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.GEMINI_API_KEY) {
    req.app.locals.geminiApiKey = process.env.GEMINI_API_KEY;
  }
  next();
});

(async () => {
  // Validate environment variables before starting the server
  validateEnvOrExit();
  logEnvironmentConfig();

  // Initialize database connections before starting the server
  try {
    log('Initializing database connections...', 'database');
    await initializeDatabases();
    log('Database connections initialized successfully', 'database');
    
    // Initialize storage layer with PostgreSQL
    initializeStorage();
    
    // Setup cron jobs
    setupCronJobs();
    log('Storage layer initialized with PostgreSQL', 'database');
    
    // Initialize email service
    const { EmailService } = await import('./services/email.service');
    const emailService = new EmailService();
    
    // Test email service configuration
    if (emailService.isReady()) {
      log('Email service initialized and configured', 'email');
    } else {
      log('Email service initialized but not configured - email features will be disabled', 'email');
    }
    
    // Store email service in app locals for access in routes
    app.locals.emailService = emailService;
    
    // Initialize study plan scheduler for reminders
    const { studyPlanScheduler } = await import('./jobs/study-plan-scheduler');
    studyPlanScheduler.start();
    log('Study plan scheduler initialized', 'scheduler');
    
  } catch (error) {
    console.error('Failed to initialize database connections:', error);
    console.error('Server cannot start without database connection');
    process.exit(1);
  }

  const server = await registerRoutes(app);

  // Centralized error handling middleware (must be last)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Determine port from environment (API_PORT) with default 5000
  // This lets us run multiple instances on different ports if needed.
  const port = parseInt(process.env.API_PORT || '5000', 10);
  // On some platforms (notably Windows) the `reusePort` option is not
  // supported and will throw ENOTSUP. Avoid passing it on those platforms.
  const listenOpts: any = {
    port,
    host: "0.0.0.0",
  };

  if (process.platform !== 'win32') {
    // non-Windows platforms can opt into reusePort where supported
    listenOpts.reusePort = true;
  }

  server.listen(listenOpts, () => {
    console.log('\n');
    console.log('  🚀 Server ready!');
    console.log('\n');
    console.log(`  ➜ Local:   \x1b[36mhttp://localhost:${port}\x1b[0m`);
    console.log(`  ➜ Network: \x1b[36mhttp://127.0.0.1:${port}\x1b[0m`);
    console.log('\n');
    if (app.get("env") === "development") {
      console.log('  ✨ Vite HMR enabled');
    }
    console.log('\n');
  });
})();
