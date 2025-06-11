# Quick Start Guide

## 🚀 Get NewsBot Running in 5 Minutes

### Option 1: Automated Setup (Recommended)
```bash
git clone <your-repo-url>
cd new-agent-app
./setup.sh
```

### Option 2: Manual Setup
```bash
# 1. Clone and install
git clone <your-repo-url>
cd new-agent-app
npm install

# 2. Setup environment
cp .env.example .env.local

# 3. Get API keys and update .env.local:
# - NewsAPI: https://newsapi.org/register
# - GNews: https://gnews.io  
# - OpenAI: https://platform.openai.com/api-keys
# - Generate NEXTAUTH_SECRET: openssl rand -base64 32

# 4. Setup database
npx prisma db push
npx prisma generate

# 5. Start development
npm run dev
```

## 🔑 Essential API Keys

| Service | Free Tier | URL | Required |
|---------|-----------|-----|----------|
| NewsAPI | 1,000 requests/day | [newsapi.org/register](https://newsapi.org/register) | ✅ Yes |
| GNews | 100 requests/day | [gnews.io](https://gnews.io) | ✅ Yes |
| OpenAI | Pay per use | [platform.openai.com](https://platform.openai.com/api-keys) | ✅ Yes |

## 🛠️ Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production

# Database
npx prisma studio       # Open database GUI
npx prisma db push      # Apply schema changes
npx prisma generate     # Generate client

# Troubleshooting
rm -rf node_modules package-lock.json && npm install  # Reset dependencies
npx prisma db reset     # Reset database
```

## 🎯 First Steps After Setup

1. **Create Account**: Visit `/auth/signup` to create your first user
2. **Test News**: Check that articles are loading on the home page
3. **Test Chat**: Sign in and try the AI chat functionality
4. **Save Articles**: Test bookmarking articles to your collection

## ❓ Need Help?

- 📖 Full documentation: [README.md](README.md)
- 🔧 Troubleshooting: [README.md#troubleshooting](README.md#-troubleshooting)
- 🐛 Report issues: [GitHub Issues](../../issues)
