import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

declare module 'express' {
  interface Request {
    session?: Express.Session & {
      userId?: number;
    }
  }
}