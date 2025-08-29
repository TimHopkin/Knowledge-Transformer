#!/bin/bash

echo "🚀 Knowledge Transformer Setup Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "📝 Please edit .env.local with your API keys:"
    echo "   - Supabase URL and keys"
    echo "   - Anthropic API key"
    echo "   - YouTube Data API key"
fi

echo ""
echo "🛠️  Setup Instructions:"
echo ""
echo "1. Set up Supabase:"
echo "   - Go to https://supabase.com and create a new project"
echo "   - Copy your project URL and anon key to .env.local"
echo "   - Run the database migration:"
echo "     npx supabase init (if not already done)"
echo "     npx supabase db reset --linked (after linking to your project)"
echo ""
echo "2. Set up Anthropic API:"
echo "   - Go to https://console.anthropic.com"
echo "   - Create an API key and add it to .env.local"
echo ""
echo "3. Set up YouTube Data API:"
echo "   - Go to Google Cloud Console"
echo "   - Enable YouTube Data API v3"
echo "   - Create credentials and add the API key to .env.local"
echo ""
echo "4. Run the development server:"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For more detailed setup instructions, see README.md"
echo ""
echo "✅ Setup script completed!"
echo "🔧 Don't forget to configure your API keys in .env.local"