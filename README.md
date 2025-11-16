# 📚 StudyForge - AI-Powered Study Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)](https://www.typescriptlang.org/)

**StudyForge** is a comprehensive AI-powered study platform featuring an intelligent chatbot assistant named **Jadoo**. Built with modern web technologies, it helps students learn effectively through interactive conversations, document summarization, flashcard generation, and personalized study planning.

## ✨ Features

### 🤖 AI Chat Assistant (Jadoo)
- **Intelligent Conversations**: Chat with Jadoo, your personal AI study assistant powered by Google Gemini
- **Multi-Subject Support**: Get help across various subjects with context-aware responses
- **Conversation History**: Save and manage multiple chat sessions
- **Message Regeneration**: Regenerate AI responses for better answers
- **Code Formatting**: Proper syntax highlighting for code examples

### 📄 Document Processing
- **Smart Summarization**: Upload and summarize PDF, DOCX, and TXT documents
- **Multiple Summary Types**: Brief, detailed, or bullet-point summaries
- **Document Management**: Store and organize your summarized documents

### 🎴 Flashcard System
- **AI-Generated Flashcards**: Create flashcards from topics or documents
- **Deck Management**: Organize flashcards into custom decks
- **Spaced Repetition**: Smart review system based on mastery levels
- **Image Support**: Add images to flashcards for visual learning
- **Export Options**: Export flashcards to PDF, CSV, or JSON
- **Analytics Dashboard**: Track your learning progress with detailed statistics

### 📊 Study Tools
- **Quiz Mode**: Test your knowledge with interactive quizzes
- **Study Planner**: Plan and track your study sessions
- **Progress Analytics**: Visualize your learning journey with charts and heatmaps
- **Streak Tracking**: Maintain study streaks for motivation

### 🔐 Authentication & Security
- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Email Verification**: OTP-based email verification system
- **Password Reset**: Secure password recovery via email
- **Session Management**: Automatic token refresh and secure logout

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **TanStack Query** - Data fetching and caching
- **Wouter** - Lightweight routing
- **Recharts** - Data visualization

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type-safe server code
- **Drizzle ORM** - Type-safe database toolkit
- **MySQL** - Relational database
- **Redis** (optional) - Caching layer

### AI & Services
- **Google Gemini AI** - Advanced language model
- **OpenAI API** - Alternative AI provider
- **Nodemailer** - Email service
- **JWT** - Secure authentication tokens

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MySQL** (v8 or higher)
- **Redis** (optional, for caching)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Dipendra2003/StudyForge.git
cd StudyForge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=StudyForge

# JWT Configuration
JWT_ACCESS_SECRET=your-access-token-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars

# Email Service (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
APP_URL=http://localhost:5000
FROM_EMAIL=StudyForge <your-email@gmail.com>

# AI API Keys
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server Configuration
API_PORT=5000
NODE_ENV=development
SESSION_SECRET=your-session-secret-key
```

### 4. Database Setup

Run database migrations:

```bash
npm run db:migrate
```

Or push schema directly (for development):

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📦 Build for Production

### Build the Application

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## 🗄️ Database Management

### Generate New Migration

```bash
npm run db:generate
```

### Run Migrations

```bash
npm run db:migrate
```

### Open Drizzle Studio (Database GUI)

```bash
npm run db:studio
```

## 🔑 API Keys Setup

### Google Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

### OpenAI API (Optional)
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env` as `OPENAI_API_KEY`

### Gmail App Password
1. Enable 2-Factor Authentication on your Google account
2. Visit [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password
4. Add to `.env` as `GMAIL_APP_PASSWORD`

## 📁 Project Structure

```
StudyForge/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── utils/         # Helper utilities
│   └── index.html
├── server/                # Backend Express application
│   ├── config/           # Configuration files
│   ├── db/               # Database connection
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic services
│   ├── utils/            # Server utilities
│   ├── routes.ts         # API routes
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema
├── migrations/           # Database migrations
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── vite.config.ts        # Vite configuration
└── drizzle.config.ts     # Drizzle ORM configuration
```

## 🎯 Key Features Explained

### Jadoo AI Assistant
Jadoo is your personal AI study companion that:
- Answers questions across multiple subjects
- Explains complex concepts in simple terms
- Provides code examples with proper formatting
- Maintains conversation context
- Offers personalized greetings and encouragement

### Document Summarization
Upload documents and get:
- Quick summaries for fast review
- Detailed summaries for comprehensive understanding
- Bullet-point summaries for easy scanning
- Saved summaries for future reference

### Flashcard Learning System
- **Smart Generation**: AI creates flashcards from any topic or document
- **Deck Organization**: Group related flashcards together
- **Mastery Tracking**: Track your progress on each card
- **Spaced Repetition**: Review cards based on your mastery level
- **Rich Content**: Add images and formatted text
- **Multiple Export Formats**: PDF, CSV, JSON

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt encryption for passwords
- **Email Verification**: OTP-based email confirmation
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: Content sanitization
- **CORS Configuration**: Controlled cross-origin requests

## 🚢 Deployment

### Environment Variables
Set all required environment variables on your hosting platform:
- Database credentials
- API keys (Gemini, OpenAI)
- Email service credentials
- JWT secrets
- Session secrets

### Recommended Platforms
- **Vercel** - Frontend and serverless functions
- **Railway** - Full-stack deployment
- **Render** - Web services and databases
- **DigitalOcean** - VPS hosting
- **AWS** - Scalable cloud infrastructure

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm start
```

## 🧪 Testing

Run end-to-end tests:

```bash
npm run test:e2e
```

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | Type check with TypeScript |
| `npm run db:generate` | Generate database migrations |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run test:e2e` | Run E2E tests |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Dipendra**
- GitHub: [@Dipendra2003](https://github.com/Dipendra2003)
- Repository: [StudyForge](https://github.com/Dipendra2003/StudyForge)

## 🙏 Acknowledgments

- Google Gemini AI for powering the AI assistant
- Radix UI for accessible components
- Tailwind CSS for styling utilities
- Drizzle ORM for type-safe database operations
- All open-source contributors

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on [GitHub](https://github.com/Dipendra2003/StudyForge/issues)
- Check existing documentation
- Review the `.env.example` file for configuration help

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Collaborative study rooms
- [ ] Voice input for chat
- [ ] More AI models support
- [ ] Study group features
- [ ] Advanced analytics
- [ ] Gamification elements
- [ ] Integration with learning platforms

---

**Made with ❤️ for students worldwide**
