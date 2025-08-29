# Knowledge Transformer

An AI-powered system that transforms YouTube content into structured, interactive learning experiences using Claude AI for analysis and synthesis.

## Overview

Transform passive YouTube consumption into active knowledge building by:
- Processing YouTube channels and individual videos
- Extracting and enhancing transcripts
- Generating AI-powered summaries and insights
- Identifying key topics and patterns across content
- Building structured learning materials

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase PostgreSQL
- **AI Processing**: Anthropic Claude API (primary), Grok API (fallback)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## Quick Start

1. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

2. **Configure your API keys in `.env.local`:**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # AI API Keys
   ANTHROPIC_API_KEY=your_anthropic_api_key
   
   # YouTube Data API
   YOUTUBE_API_KEY=your_youtube_data_api_key
   ```

3. **Set up your database:**
   ```bash
   # Apply the database schema
   npx supabase db reset --linked
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open http://localhost:3000** in your browser

## Detailed Setup

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- Git

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to Settings > API
3. Copy your Project URL and anon public key
4. Copy your service role key (keep this secret!)
5. Add these to your `.env.local` file

### 2. Database Schema

Apply the database migration:

```bash
# If you haven't initialized Supabase locally
npx supabase init

# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
npx supabase db reset --linked
```

Or manually run the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase dashboard.

### 3. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up for an account and add credits
3. Create an API key
4. Add it to your `.env.local` file

### 4. YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API key)
5. Add it to your `.env.local` file

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Development Server

```bash
npm run dev
```

## Usage

1. **Navigate to the Dashboard** at `http://localhost:3000/dashboard`

2. **Paste YouTube URLs** in the text area (one per line):
   - Individual videos: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Channels: `https://www.youtube.com/channel/CHANNEL_ID` or `https://www.youtube.com/@handle`
   - Playlists: `https://www.youtube.com/playlist?list=PLAYLIST_ID`

3. **Configure Processing Options:**
   - Max videos per channel (5-50)
   - Summary length (short/medium/long)
   - Summary focus (overview/key points/actionable)
   - Extract topics toggle

4. **Click "Process Content"** and wait for the AI analysis to complete

5. **View Results** including summaries, key points, and extracted topics

## Features

### Current Features (MVP)
- ✅ YouTube URL input and validation
- ✅ Video metadata extraction
- ✅ Transcript extraction (YouTube captions)
- ✅ AI-powered content analysis using Claude
- ✅ Automatic topic extraction
- ✅ Batch processing of multiple URLs
- ✅ Cost estimation and tracking
- ✅ Real-time processing status

### Planned Features
- 🔄 Content viewing interface with highlights
- 🔄 Search across processed content
- 🔄 Automated content synchronization
- 🔄 Cross-video synthesis and pattern recognition
- 🔄 Interactive learning features
- 🔄 Export capabilities

## Development Phases

### Phase 1: MVP Foundation ✅
- YouTube URL input and processing
- Transcript extraction and AI analysis
- Basic topic extraction
- Simple web interface

### Phase 2: Enhanced Processing
- Multi-video synthesis
- Automated content synchronization
- Advanced content viewing interface
- Search functionality

### Phase 3: Learning Systems
- Interactive courses and AI tutoring
- Progress tracking and analytics
- Spaced repetition system

### Phase 4: Advanced Intelligence
- Cross-domain pattern recognition
- Multi-source content processing
- Community features and integrations

## Project Structure

```
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   │   ├── youtube/       # YouTube processing endpoints
│   │   ├── content/       # Content management endpoints
│   │   └── ai/           # AI processing endpoints
│   ├── dashboard/         # Main dashboard page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── youtube/          # YouTube-specific components
│   └── content/          # Content display components
├── lib/                   # Utility libraries
│   ├── ai/               # AI integration (Claude, Grok)
│   │   ├── claude.ts     # Claude API integration
│   │   └── index.ts      # Main AI interface
│   ├── youtube.ts        # YouTube API integration
│   ├── transcripts.ts    # Transcript extraction
│   ├── supabase.ts       # Database client
│   └── utils.ts          # Utility functions
├── types/                 # TypeScript type definitions
├── supabase/             # Database migrations
└── setup.sh              # Setup script
```

## API Endpoints

### POST `/api/youtube/process`
Process YouTube URLs and generate AI analysis.

**Request:**
```json
{
  "urls": ["https://youtube.com/watch?v=..."],
  "options": {
    "maxVideos": 10,
    "extractTopics": true,
    "summaryLength": "medium",
    "summaryFocus": "key_points"
  }
}
```

### GET `/api/content`
Get processed content items.

**Query Parameters:**
- `limit`: Number of items to return (default: 20)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by processing status

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the existing issues in the GitHub repository
2. Create a new issue with detailed information
3. Include logs and error messages when applicable

## Costs

**Estimated costs for AI processing:**
- Short video (10 min): ~$0.02-0.05
- Medium video (30 min): ~$0.05-0.15
- Long video (60+ min): ~$0.15-0.30
- Small channel (10 videos): ~$0.50-1.50
- Large channel (50 videos): ~$2.50-7.50

Costs depend on transcript length, summary detail, and whether topics are extracted.