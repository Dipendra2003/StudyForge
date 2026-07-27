# 📚 StudyForge

> **AI-Powered Study Platform** - Transform your learning experience with intelligent flashcards, adaptive quizzes, and personalized study plans.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://reactjs.org/)

---

## 🌟 Overview

**StudyForge** is a comprehensive AI-powered study platform designed to revolutionize how students learn and retain information. Built with modern web technologies and powered by Google Gemini AI, StudyForge offers intelligent flashcard generation, adaptive quizzes, document summarization, and personalized study planning.

### 🎯 Key Highlights

- 🤖 **AI-Powered Learning** - Leverage Google Gemini AI for intelligent content generation
- 📝 **Smart Flashcards** - Auto-generate flashcards from documents, text, or topics
- 🎮 **Adaptive Quizzes** - Dynamic difficulty adjustment based on performance
- 📊 **Analytics Dashboard** - Track progress with detailed insights and visualizations
- 📅 **Study Planner** - Organize your learning with customizable study schedules
- 💬 **AI Chat Assistant** - Get instant help with your study questions
- 🌙 **Dark Mode** - Beautiful UI with light/dark theme support
- 📱 **Responsive Design** - Seamless experience across all devices

---

## 🖼️ Screenshots

### Dashboard
![Dashboard Preview](https://via.placeholder.com/800x450/4F46E5/FFFFFF?text=Dashboard+Preview)

### Flashcard Study Mode
![Flashcard Mode](https://via.placeholder.com/800x450/10B981/FFFFFF?text=Flashcard+Study+Mode)

### Quiz Interface
![Quiz Mode](https://via.placeholder.com/800x450/F59E0B/FFFFFF?text=Adaptive+Quiz+Mode)

### Analytics Dashboard
![Analytics](https://via.placeholder.com/800x450/8B5CF6/FFFFFF?text=Analytics+Dashboard)

---

## 🚀 Live Demo

🔗 **Coming Soon** - Project will be deployed shortly!

---

## ✨ Features

### 🎓 Core Learning Features
- **AI Flashcard Generation** - Generate flashcards from text, documents (PDF, DOCX), or topics
- **Spaced Repetition System** - Optimize retention with scientifically-proven review intervals
- **Adaptive Quiz Mode** - Dynamic difficulty adjustment based on real-time performance
- **Quiz of the Day** - Daily challenges to keep learning consistent
- **Study Planner** - Create and manage personalized study schedules
- **Document Summarization** - Extract key insights from PDFs and Word documents

### 🤖 AI-Powered Tools
- **AI Chat Assistant** - Interactive learning companion for instant help
- **Context-Aware Conversations** - AI dynamically tracks user XP, study plans, and historical context
- **Resilient AI Infrastructure** - Auto-failover to backup models during high-traffic 503 overloads (Gemini 3.1 Flash Lite -> Gemini 2.5 Flash)
- **Smart Chat Sessions** - Automatically generates concise, relevant titles for new chats
- **Code Generator** - Generate code snippets with explanations and run them instantly
- **Bulk Quiz Generation** - Create multiple quizzes simultaneously
- **Smart Hints** - Context-aware hints during quizzes

### 📊 Analytics & Progress Tracking
- **Mastery Charts** - Visualize your learning progress by category
- **Review Heatmap** - Track study consistency over time
- **Streak Display** - Maintain daily study streaks
- **Performance Insights** - Detailed analytics on quiz performance
- **Weak Area Recommendations** - AI-suggested focus areas

### 🎨 User Experience
- **Dark/Light Theme** - Customizable appearance
- **Keyboard Shortcuts** - Efficient navigation for power users
- **Export Options** - Download flashcards as PDF or DOCX
- **Share Quizzes** - Collaborate with friends via shareable links

### 🔐 Security & Authentication
- **Email Verification** - Secure account activation
- **Password Reset** - Secure password recovery flow
- **JWT Authentication** - Secure session management
- **Rate Limiting** - Protection against abuse
- **Account Lockout** - Brute-force attack prevention

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18.3.1 with TypeScript
- **Routing:** Wouter (lightweight React router)
- **State Management:** TanStack Query (React Query)
- **UI Components:** Radix UI primitives
- **Styling:** Tailwind CSS with custom animations
- **Forms:** React Hook Form with Zod validation
- **Charts:** Recharts for data visualization
- **Animations:** Framer Motion

### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Passport.js with JWT
- **Session Management:** Express Session with Redis/File Store
- **Email:** Nodemailer with SMTP
- **File Upload:** Multer
- **Security:** Helmet, CORS, Rate Limiting

### AI & Machine Learning
- **Primary AI:** Google Gemini 3.1 Flash Lite Preview
- **Fallback AI:** Google Gemini 2.5 Flash (for high availability failover)
- **Document Processing:** PDF-Parse, Mammoth (DOCX)
- **Caching:** Redis for AI response caching

### DevOps & Tools
- **Build Tool:** Vite
- **Package Manager:** npm
- **Database Migrations:** Drizzle Kit
- **Testing:** Vitest with Fast-Check (property-based testing)
- **Code Quality:** TypeScript strict mode
- **Bundler:** esbuild for production builds

---

## 📦 Installation

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v20.0.0 or higher)
- **npm** (v10.0.0 or higher)
- **PostgreSQL** (v14.0 or higher)
- **Redis** (optional, for caching)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Dipendra2003/StudyForge.git
cd StudyForge
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure the following required variables:

```env
# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/studyforge





# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# JDoodle API for Code Execution (Optional)
JDOODLE_CLIENT_ID=your-jdoodle-client-id
JDOODLE_CLIENT_SECRET=your-jdoodle-client-secret

# Email (Optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

> 💡 **Tips:** 
> - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
> - Get JDoodle credentials from [JDoodle Compiler API](https://www.jdoodle.com/compiler-api) (Free tier: 200 requests/day)

### Step 4: Database Setup

```bash
# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (for development)
npm run db:push
```

### Step 5: Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

---

## 🎮 Usage

### Creating Your First Flashcard Deck

1. **Navigate to Flashcards** - Click "Flashcards" in the sidebar
2. **Create a Deck** - Click "Create New Deck" and give it a name
3. **Add Flashcards** - Choose from:
   - Manual entry
   - AI generation from text
   - Upload a document (PDF/DOCX)
4. **Start Studying** - Click "Study" to begin your learning session

### Taking an Adaptive Quiz

1. **Go to Quiz Mode** - Select "Quiz Mode" from the navigation
2. **Configure Quiz** - Choose:
   - Number of questions
   - Difficulty level
   - Categories
3. **Start Quiz** - Answer questions and watch difficulty adapt to your performance
4. **Review Results** - Analyze your performance and weak areas

### Using the AI Chat Assistant

1. **Open Chat** - Click "Chat" in the sidebar
2. **Ask Questions** - Type your study-related questions
3. **Get Instant Help** - Receive AI-powered explanations and guidance

### Creating a Study Plan

1. **Navigate to Study Planner** - Click "Study Planner"
2. **Create Plan** - Set goals, deadlines, and topics
3. **Add Study Items** - Break down your plan into manageable tasks
4. **Track Progress** - Mark items complete as you study

---

## 📁 Project Structure

```
studyforge/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── quiz/        # Quiz-specific components
│   │   │   ├── chat/        # Chat interface components
│   │   │   └── ui/          # Base UI components (Radix)
│   │   ├── contexts/        # React contexts (Auth, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   ├── pages/           # Page components
│   │   └── App.tsx          # Main app component
│   ├── index.html           # HTML entry point
│   └── vite.config.ts       # Vite configuration
│
├── server/                   # Backend Express application
│   ├── config/              # Configuration files
│   ├── db/                  # Database schemas and migrations
│   ├── middleware/          # Express middleware
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   │   ├── gemini.ts       # Gemini AI integration
│   │   ├── quiz-of-the-day.service.ts
│   │   └── batch-quiz-generator.ts
│   ├── utils/               # Utility functions
│   ├── index.ts             # Server entry point
│   └── routes.ts            # Route definitions
│
├── shared/                   # Shared code between client/server
│   ├── schema.ts            # Database schema (Drizzle)
│   └── quiz-types.ts        # Shared TypeScript types
│
├── db/                      # Database migrations
│   └── migrations/
│
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── vite.config.ts           # Vite build configuration
```

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://...` |




| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-key` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JDOODLE_CLIENT_ID` | JDoodle API client ID for code execution | - |
| `JDOODLE_CLIENT_SECRET` | JDoodle API client secret | - |
| `SMTP_HOST` | Email SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `REDIS_HOST` | Redis host for caching | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `API_PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |

See `.env.example` for complete configuration options.

---

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/logout            # Logout user
POST   /api/auth/refresh           # Refresh JWT token
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password
POST   /api/auth/verify-email      # Verify email address
GET    /api/auth/me                # Get current user
```

### Flashcards

```
GET    /api/flashcards             # Get all flashcards
POST   /api/flashcards             # Create flashcard
GET    /api/flashcards/:id         # Get flashcard by ID
PUT    /api/flashcards/:id         # Update flashcard
DELETE /api/flashcards/:id         # Delete flashcard
POST   /api/flashcards/generate    # AI-generate flashcards
POST   /api/flashcards/bulk        # Bulk create flashcards
```

### Quizzes

```
GET    /api/quizzes                # Get all quizzes
POST   /api/quizzes/generate       # Generate AI quiz
POST   /api/quizzes/submit         # Submit quiz answers
GET    /api/quizzes/history        # Get quiz history
GET    /api/quizzes/qotd           # Get Quiz of the Day
POST   /api/quizzes/share          # Share quiz
GET    /api/quizzes/shared/:linkId # Get shared quiz
```

### Study Plans

```
GET    /api/study-plans            # Get all study plans
POST   /api/study-plans            # Create study plan
GET    /api/study-plans/:id        # Get study plan by ID
PUT    /api/study-plans/:id        # Update study plan
DELETE /api/study-plans/:id        # Delete study plan
```

### AI Services

```
POST   /api/ai/chat                # Chat with AI assistant
POST   /api/ai/summarize           # Summarize document
POST   /api/ai/generate-code       # Generate code snippet
```

### Analytics

```
GET    /api/analytics/dashboard    # Get dashboard stats
GET    /api/analytics/progress     # Get learning progress
GET    /api/analytics/heatmap      # Get study heatmap
GET    /api/analytics/mastery      # Get mastery by category
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run Tests with UI

```bash
npm run test:ui
```

### Type Checking

```bash
npm run check
```

---

## 🏗️ Build for Production

### Build the Application

```bash
npm run build
```

This will:
1. Build the frontend with Vite
2. Bundle the backend with esbuild
3. Output to `dist/` directory

### Start Production Server

```bash
npm start
```

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] User authentication and authorization
- [x] Flashcard creation and management
- [x] AI-powered flashcard generation
- [x] Basic quiz functionality
- [x] Study planner

### Phase 2: AI Enhancement ✅
- [x] Adaptive quiz difficulty
- [x] AI chat assistant
- [x] Document summarization
- [x] Code generation
- [x] Quiz of the Day

### Phase 3: Social & Collaboration 🚧
- [ ] Study groups and collaboration
- [ ] Public flashcard marketplace
- [ ] Leaderboards and competitions
- [ ] Social sharing and profiles
- [ ] Comments and discussions

### Phase 4: Advanced Features 🔮
- [ ] Mobile app (React Native)
- [ ] Offline mode with sync
- [ ] Video content integration
- [ ] Gamification system
- [ ] Advanced analytics with ML insights
- [ ] Multi-language support
- [ ] API for third-party integrations

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/Dipendra2003/StudyForge.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow the existing code style
   - Add tests for new features

4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Wait for review and feedback

### Contribution Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep PRs focused on a single feature/fix

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow project guidelines

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 StudyForge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 👨‍💻 Author

**Dipendra Kumar**

- GitHub: [@Dipendra2003](https://github.com/Dipendra2003)
- LinkedIn: [Dipendra Kumar](https://www.linkedin.com/in/dipendra-kumar-b077b9286/)
- Email: dipendrak299@gmail.com
- Portfolio: [portfolio-dipendra.vercel.app](https://portfolio-dipendra.vercel.app/)

---

## 🙏 Acknowledgments

- **Google Gemini AI** - For powering our AI features
- **Radix UI** - For accessible component primitives
- **Tailwind CSS** - For the utility-first CSS framework
- **Drizzle ORM** - For type-safe database operations
- **React Community** - For amazing tools and libraries

---

## 📞 Support

Need help? Feel free to reach out!

- 📧 **Email:** dipendrak299@gmail.com
-  **Issues:** [GitHub Issues](https://github.com/Dipendra2003/StudyForge/issues)

---

## ⭐ Show Your Support

If you find StudyForge helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 🤝 Contributing to the codebase
- 📢 Sharing with friends and colleagues

---

<div align="center">

**Made with ❤️ by Dipendra Kumar**

[GitHub](https://github.com/Dipendra2003/StudyForge) • [Portfolio](https://portfolio-dipendra.vercel.app/)

</div>
