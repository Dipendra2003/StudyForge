// Type definitions for Express extensions
// Authentication completely removed from application

declare global {
  namespace Express {
    interface Request {
      // No user authentication - all endpoints are public
    }
  }
}