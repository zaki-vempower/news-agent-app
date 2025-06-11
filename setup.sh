#!/bin/bash

# NewsBot AI - Automated Setup Script
# This script will help you set up the development environment

echo "🚀 NewsBot AI - Setup Script"
echo "================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org${NC}"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: $NPM_VERSION${NC}"
fi

echo

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo

# Setup environment file
echo -e "${BLUE}⚙️  Setting up environment file...${NC}"
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✅ Created .env.local from .env.example${NC}"
        echo -e "${YELLOW}📝 Please edit .env.local and add your API keys:${NC}"
        echo -e "   • NewsAPI key from: https://newsapi.org/register"
        echo -e "   • GNews key from: https://gnews.io"
        echo -e "   • OpenAI key from: https://platform.openai.com/api-keys"
        echo -e "   • Generate NEXTAUTH_SECRET with: openssl rand -base64 32"
    else
        echo -e "${RED}❌ .env.example file not found${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  .env.local already exists, skipping...${NC}"
fi

echo

# Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
if npx prisma db push; then
    echo -e "${GREEN}✅ Database schema applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to setup database${NC}"
    exit 1
fi

if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma client generated successfully${NC}"
else
    echo -e "${RED}❌ Failed to generate Prisma client${NC}"
    exit 1
fi

echo

# Final setup instructions
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. Edit .env.local and add your API keys"
echo -e "2. Run: ${GREEN}npm run dev${NC}"
echo -e "3. Open: ${GREEN}http://localhost:3000${NC}"
echo
echo -e "${YELLOW}🔑 Required API Keys:${NC}"
echo -e "   • NewsAPI: https://newsapi.org/register (1,000 free requests/day)"
echo -e "   • GNews: https://gnews.io (100 free requests/day)"  
echo -e "   • OpenAI: https://platform.openai.com/api-keys (Required for chat)"
echo
echo -e "${BLUE}📖 For more information, see README.md${NC}"
echo

# Ask if user wants to open the editor
read -p "Would you like to open .env.local in your default editor now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code .env.local
    elif command -v nano &> /dev/null; then
        nano .env.local
    elif command -v vim &> /dev/null; then
        vim .env.local
    else
        echo -e "${YELLOW}No editor found. Please manually edit .env.local${NC}"
    fi
fi

echo -e "${GREEN}Happy coding! 🚀${NC}"