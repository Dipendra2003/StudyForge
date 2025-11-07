# Jadoo 2.0 - AI Study Assistant

## Overview

Jadoo 2.0 is an AI-powered educational platform designed to transform how students learn. The application provides comprehensive study assistance through features like AI-powered Q&A, document summarization, flashcard generation, quiz creation, code generation, and personalized study planning. Built as a full-stack web application, it combines a React frontend with an Express backend, utilizing AI services for intelligent content generation and learning support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and optimized production builds
- **Routing:** Wouter for lightweight client-side routing
- **State Management:** TanStack Query (React Query) for server state management
- **UI Components:** Radix UI primitives with custom shadcn/ui components
- **Styling:** Tailwind CSS with PostCSS for utility-first styling
- **Animations:** Framer Motion for smooth, interactive animations
- **Forms:** React Hook Form with Zod validation

**Key Design Patterns:**
- Component-based architecture with reusable UI components
- Custom hooks for encapsulating business logic (e.g., `use-waitlist`, `use-toast`)
- Context API for authentication state management
- Type-safe API communication through centralized queryClient
- Theme provider for light/dark mode support

**Directory Structure:**
- `/client/src/components` - Reusable UI components and layouts
- `/client/src/pages` - Route-based page components
- `/client/src/hooks` - Custom React hooks
- `/client/src/lib` - Utility functions and shared logic

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js framework
- **Language:** TypeScript with ES modules
- **Database ORM:** Drizzle ORM configured for MySQL
- **Session Management:** Express-session with MemoryStore
- **Password Hashing:** bcrypt for secure authentication

**API Design:**
- RESTful API architecture with `/api` prefix for all endpoints
- Middleware chain: JSON parsing → session management → request logging → authentication
- Centralized error handling with Zod validation
- Session-based authentication with secure cookie configuration

**Key Modules:**
- `/server/routes.ts` - API endpoint definitions and routing logic
- `/server/storage.ts` - Data access layer interface for CRUD operations
- `/server/db/index.ts` - Database connection management
- `/server/services/openai.ts` - AI service integration layer
- `/server/vite.ts` - Development server setup with HMR support

**Authentication Strategy:**
- Session-based authentication using express-session
- Middleware-based route protection
- Password hashing with bcrypt
- Secure cookie configuration (HTTPS-only in production)

### Data Storage Solutions

**Primary Database:** MySQL
- Structured data storage using Drizzle ORM with mysql2 driver
- Schema-first approach with TypeScript type safety
- Migration management via `drizzle-kit`
- Replaced hybrid PostgreSQL + MongoDB architecture with unified MySQL storage

**Database Schema Highlights:**
- **Users:** Account management with role-based access control, login tracking, and profile information
- **Documents:** User-uploaded study materials with metadata and summaries
- **Flashcards:** Spaced repetition learning cards with categories and difficulty levels
- **MCQs:** Multiple-choice questions with correct answers and explanations (correctOption as INT)
- **Code Snippets:** Generated code solutions with language and problem context
- **Study Plans:** Personalized learning schedules with JSON scheduleData and completion tracking
- **Chat History:** Conversation logs for AI assistant interactions with lastUpdated tracking
- **Summaries:** AI-generated document summaries stored directly in MySQL
- **Cached Responses:** AI response caching for improved performance
- **Achievements & User Stats:** Achievement tracking and learning analytics

**Caching Layer:** Redis (optional)
- Configured for session caching and performance optimization
- Not required for basic functionality

**Migration Notes (November 2025):**
- Migrated from PostgreSQL + MongoDB to MySQL-only architecture
- All AI-generated content (chat history, summaries, code snippets) now stored in MySQL instead of MongoDB
- Removed waitlist functionality (deprecated)
- **IMPORTANT:** Before running `npm run db:push`, manually update `drizzle.config.ts` to change `dialect: "postgresql"` to `dialect: "mysql2"`

**Schema Location:** `/shared/schema.ts`
- Centralized schema definitions shared between frontend and backend
- Zod schemas for runtime validation
- Type inference for compile-time type safety

### External Dependencies

**AI Services:**
- **OpenAI API:** Primary AI provider for chat completions, content generation, and educational assistance
  - Used for: Q&A responses, document summarization, flashcard generation, code generation
  - Model: GPT-3.5-turbo (configurable)
  - Service wrapper: `/server/services/openai.ts`

**Database Services:**
- **MySQL:** Primary relational database (local or cloud-hosted)
  - Connection via `mysql2/promise` driver
  - Configured through `DATABASE_URL` environment variable
  - Schema management via Drizzle Kit migrations

**UI Component Library:**
- **Radix UI:** Unstyled, accessible component primitives
  - Provides foundation for dialogs, dropdowns, accordions, etc.
  - Fully accessible and keyboard-navigable

**Styling & Theming:**
- **Tailwind CSS:** Utility-first CSS framework
- **shadcn/ui:** Component collection built on Radix + Tailwind
- **@replit/vite-plugin-shadcn-theme-json:** Dynamic theme configuration

**Development Tools:**
- **Replit Integration:** Cartographer plugin for code intelligence in Replit environment
- **Runtime Error Overlay:** Development error modal for better debugging

**Form & Validation:**
- **Zod:** Schema validation library for runtime type checking
- **React Hook Form:** Performant form management with minimal re-renders
- **@hookform/resolvers:** Zod integration for form validation

**Environment Variables Required:**
- `DATABASE_URL` - MySQL connection string (format: `mysql://user:password@host:port/database`)
- `OPENAI_API_KEY` - OpenAI API authentication
- `SESSION_SECRET` - Session encryption key
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Optional Redis configuration