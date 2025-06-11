# NewsBot AI - News Aggregation & AI Chat Platform

A modern Next.js application that aggregates news from multiple sources and provides an AI-powered chatbot with persistent chat sessions and user authentication.

> **🚀 Quick Start**: Run `./setup.sh` for automated setup, or see [QUICKSTART.md](QUICKSTART.md) for a 5-minute guide.

## Features

- 🗞️ **Multi-Source News Aggregation**: Fetches latest news from NewsAPI, GNews, and more
- 🏷️ **Smart Category Filtering**: Filter news by genre with optimized performance
- 🔍 **Real-time Search**: Debounced search with instant results
- 🤖 **AI-Powered Chatbot**: Intelligent assistant with context-aware responses
- 💬 **Persistent Chat Sessions**: Save and restore chat conversations
- 🔐 **User Authentication**: Secure signup/signin with NextAuth.js
- 📚 **Saved Articles**: Bookmark articles for later reading
- 💾 **Database Persistence**: SQLite with Prisma ORM for all data
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS
- ⚡ **Performance Optimized**: Debounced search, memoized filtering, smooth scrolling
- 📱 **Mobile Friendly**: Fully responsive design

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with credential-based auth
- **AI**: OpenAI GPT-4 with intelligent fallbacks
- **News APIs**: NewsAPI.org, GNews.io
- **Performance**: Custom debouncing, memoization, optimized state management
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### 🚀 Installation & Setup

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd new-agent-app
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

4. **Get your API keys and update `.env.local`:**

**Required APIs:**
```env
# Get from https://newsapi.org/register (1,000 free requests/day)
NEWS_API_KEY=your_newsapi_key_here

# Get from https://gnews.io (100 free requests/day)  
GNEWS_API_KEY=your_gnews_api_key_here

# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Generate secure secret (at least 32 characters)
NEXTAUTH_SECRET=your_very_secure_secret_key_at_least_32_characters_long
```

5. **Set up the database:**
```bash
npx prisma db push
npx prisma generate
```

6. **Start the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎯 Key Features & Usage

### 🔐 Authentication System
- **Sign Up**: Create account with email and password
- **Sign In**: Secure authentication with NextAuth.js
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Management**: Persistent login sessions

### 📰 News Tab
- **Multi-Source Aggregation**: Real-time news from NewsAPI and GNews
- **Smart Category Filtering**: Choose from 9+ categories with instant filtering
- **Optimized Search**: Debounced search (500ms delay) prevents UI stuttering
- **Infinite Scroll**: Smooth loading with throttled scroll events
- **Article Management**: Save articles to your personal collection
- **Performance**: Memoized filtering and optimized API calls

### 💬 AI Chat Tab (Authenticated Users)
- **Persistent Sessions**: Chat history saved to database
- **Session Management**: Create, switch, and delete chat sessions via tabs
- **Context-Aware AI**: Discusses selected articles or general news
- **Article Selection**: Choose specific articles for focused discussion
- **Real-time Responses**: Powered by OpenAI GPT-4
- **Session Restoration**: Continue conversations after page refresh

### 🔖 Saved Articles (Authenticated Users)
- **Personal Collection**: Save interesting articles for later
- **Quick Access**: Dedicated saved articles page
- **Persistent Storage**: Articles saved to your user account

## ⚡ Performance Optimizations

This application includes several performance enhancements:

- **Debounced Search**: 500ms delay prevents excessive API calls during typing
- **Memoized Filtering**: Smart caching of filtered results
- **Throttled Scrolling**: Smooth infinite scroll with 100ms throttling
- **Optimized State Management**: Efficient useEffect dependency arrays
- **Smart API Calls**: Reduced from 10-20 calls per search to 1 call per search

## 🔧 Configuration

### API Keys Setup

1. **NewsAPI** (Primary source - 1,000 free requests/day):
   - Visit [newsapi.org/register](https://newsapi.org/register)
   - Create account and get API key
   - Add to `.env.local`: `NEWS_API_KEY=your_key_here`

2. **GNews** (Fallback source - 100 free requests/day):
   - Visit [gnews.io](https://gnews.io)
   - Sign up and get API key
   - Add to `.env.local`: `GNEWS_API_KEY=your_key_here`

3. **OpenAI** (Required for chat functionality):
   - Visit [platform.openai.com](https://platform.openai.com/api-keys)
   - Create API key
   - Add to `.env.local`: `OPENAI_API_KEY=your_key_here`

4. **NextAuth Secret**:
   ```bash
   # Generate secure secret
   openssl rand -base64 32
   ```
   Add to `.env.local`: `NEXTAUTH_SECRET=generated_secret`

### Optional OAuth Providers

To enable Google/GitHub login, uncomment and configure in `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth  
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth configuration
│   │   │   └── signup/route.ts           # User registration
│   │   ├── chat/route.ts                 # AI chat endpoint
│   │   ├── chat-sessions/
│   │   │   ├── route.ts                  # Session management
│   │   │   └── [id]/route.ts             # Individual session operations
│   │   ├── news/route.ts                 # News aggregation API
│   │   └── saved-articles/route.ts       # User saved articles
│   ├── auth/
│   │   ├── signin/page.tsx               # Sign in page
│   │   └── signup/page.tsx               # Sign up page
│   ├── saved/page.tsx                    # Saved articles page
│   ├── layout.tsx                        # Root layout with providers
│   ├── page.tsx                          # Home page
│   └── globals.css                       # Global styles
├── components/
│   ├── ChatBotWithSessions.tsx          # Chat with session management
│   ├── NewsApp.tsx                       # Main application component
│   ├── NewsCard.tsx                      # News article card component
│   └── SessionProvider.tsx              # NextAuth session provider
├── hooks/
│   └── useDebounce.ts                    # Performance optimization hook
├── lib/
│   ├── auth.ts                           # NextAuth configuration
│   ├── chatbot.ts                        # OpenAI integration
│   ├── db.ts                             # Prisma database client
│   ├── newsAPI.ts                        # News API integrations
│   └── scraper.ts                        # Web scraping utilities
└── types/
    └── next-auth.d.ts                    # NextAuth type extensions
```

## 🗄️ Database Schema

The application uses the following main models:

### User Model
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   # For credential authentication
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  chatSessions  ChatSession[]
  savedArticles SavedArticle[]
}
```

### News & Articles
```prisma
model NewsArticle {
  id           String    @id @default(cuid())
  title        String
  summary      String?
  content      String
  url          String    @unique
  imageUrl     String?
  source       String
  category     String?
  publishedAt  DateTime
  scrapedAt    DateTime  @default(now())
  savedArticles SavedArticle[]
}

model SavedArticle {
  id        String      @id @default(cuid())
  userId    String
  articleId String
  savedAt   DateTime    @default(now())
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  article   NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  @@unique([userId, articleId])
}
```

### Chat System
```prisma
model ChatSession {
  id        String        @id @default(cuid())
  userId    String
  title     String
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  isActive  Boolean       @default(true)
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  content   String
  isUser    Boolean
  timestamp DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma db push` - Push database schema
- `npx prisma generate` - Generate Prisma client
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma db reset` - Reset database

## 🚀 One-Click Setup

For the fastest setup experience, run the automated setup script:

```bash
./setup.sh
```

This script will:
- ✅ Check prerequisites (Node.js, npm)
- 📦 Install all dependencies
- ⚙️ Create .env.local from template
- 🗄️ Setup database schema
- 📝 Provide next steps and API key links

## 🔧 Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**2. Database connection issues**
```bash
# Reset and recreate database
npx prisma db reset
npx prisma db push
npx prisma generate
```

**3. API key errors**
- Verify all required API keys are set in `.env.local`
- Check API key validity and rate limits
- Ensure NEXTAUTH_SECRET is at least 32 characters

**4. Chat not working**
- Ensure OPENAI_API_KEY is set and valid
- Check OpenAI account has sufficient credits
- Verify authentication is working (sign in required)

**5. News not loading**
- Check NEWS_API_KEY and GNEWS_API_KEY
- Verify API rate limits haven't been exceeded
- Check network connectivity

### Performance Tips

- **Search slow?** The debounced search should prevent excessive API calls
- **Stuttering UI?** Clear browser cache and restart dev server
- **Memory issues?** Use `npm run build` for production optimizations

### Development Tools

```bash
# View database in browser
npx prisma studio

# Check TypeScript errors
npx tsc --noEmit

# Run linting
npm run lint

# Check build
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Maintain performance optimizations
- Add proper error handling
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](../../issues)
3. Create a new issue with detailed information
4. Join our community discussions

## 🌟 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [OpenAI](https://openai.com/) - AI capabilities
- [NewsAPI](https://newsapi.org/) - News data
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Prisma](https://prisma.io/) - Database ORM

---

**Happy coding! 🚀**
