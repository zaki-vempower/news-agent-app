# NewsBot AI - News Scraping & Chatbot App

A modern Next.js application that scrapes news from the internet and provides an AI-powered chatbot to answer questions about the news.

## Features

- 🗞️ **Automated News Scraping**: Fetches latest news articles from multiple sources
- 🏷️ **Category Filtering**: Filter news by genre (Technology, Environment, Business, Sports, etc.)
- 🤖 **AI Chatbot**: Intelligent assistant that answers questions about the news
- 💾 **Data Persistence**: Stores news articles and chat history in SQLite database
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- 🔄 **Real-time Updates**: Refresh news and get live updates
- 📱 **Mobile Friendly**: Fully responsive design

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **AI**: OpenAI GPT (optional) with fallback responses
- **Web Scraping**: Axios, Cheerio
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd new-agent-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:
```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=your_openai_api_key_here  # Optional but recommended
```

4. Set up the database:
```bash
npm run db:generate
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

## Usage

### News Tab
- View the latest scraped news articles
- **Filter by Category**: Use the dropdown to filter news by genre:
  - All News (default)
  - Environment
  - Technology  
  - Economy
  - Science
  - Business
  - Politics
  - Sports
  - Health
- Each article shows title, summary, source, category, and publication date
- Click "Read More" to view the full article on the original site
- Use the "Refresh" button to fetch new articles for the selected category

### Chatbot Tab
- Ask questions about the news articles
- The AI will provide answers based on the current news context
- Try questions like:
  - "What are the latest climate developments?"
  - "Tell me about recent AI breakthroughs"
  - "Summarize today's top stories"

## Configuration

### OpenAI API Key (Optional)
To enable enhanced AI responses, get an API key from [OpenAI](https://platform.openai.com/api-keys) and add it to your `.env.local` file.

Without an API key, the chatbot will still work using keyword-based fallback responses.

### News Sources
The app currently includes sample news data. To add real news scraping:

1. Edit `src/lib/scraper.ts` 
2. Add RSS feed URLs or implement API integrations
3. Configure scraping selectors for different news sites

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts    # Chat API endpoint
│   │   └── news/route.ts    # News API endpoint
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/
│   ├── ChatBot.tsx          # Chat interface
│   ├── NewsApp.tsx          # Main app component
│   └── NewsCard.tsx         # News article card
└── lib/
    ├── chatbot.ts           # AI chatbot logic
    ├── db.ts                # Database client
    └── scraper.ts           # News scraping utilities
```

## Database Schema

The app uses two main models:

- **NewsArticle**: Stores scraped news articles
- **ChatMessage**: Stores chat conversation history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
