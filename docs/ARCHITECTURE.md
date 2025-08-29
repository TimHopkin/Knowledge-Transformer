# Knowledge Transformer - Architecture Documentation

## System Overview

The Knowledge Transformer is a full-stack application that converts YouTube content into structured learning materials using AI analysis.

## Architecture Components

### 1. Frontend (Next.js 14 + React)
- **Dashboard**: Main interface for URL input and processing management
- **Content Library**: Browse and search processed content
- **Real-time Status**: Live updates during processing

### 2. Backend API (Next.js API Routes)
- **YouTube Integration**: Video/channel/playlist metadata extraction
- **Transcript Processing**: Captions extraction with Whisper fallback
- **AI Analysis**: Claude integration for summarization and topic extraction
- **Error Handling**: Granular status tracking and retry mechanisms

### 3. Database (Supabase PostgreSQL)
- **Content Management**: Sources, items, transcripts, summaries
- **Topic Extraction**: AI-identified topics and relationships
- **Processing Jobs**: Cost tracking and job management
- **User Management**: Authentication and data isolation

### 4. AI Processing Pipeline

```
YouTube URL → Metadata → Transcript → AI Analysis → Structured Output
     ↓           ↓           ↓            ↓              ↓
   Validate   Extract    Captions     Claude API    Database
             Details    +Whisper    Processing     Storage
```

## Processing Status Flow

```
pending → fetching_metadata → extracting_transcript → ai_processing → saving_data → completed
                                     ↓
                               (any step can go to)
                                     ↓
                                  failed ← (with detailed error info)
                                     ↓
                                (retry possible)
```

## Error Handling Strategy

### 1. Granular Error Classification
- **YouTube API Errors**: quota exceeded, video private, not found
- **Transcript Errors**: no captions, language unsupported, API failures
- **AI Processing Errors**: rate limits, token limits, timeouts
- **Database Errors**: connection issues, constraint violations

### 2. User-Friendly Error Messages
Each error type provides:
- Clear explanation of what went wrong
- Actionable steps to resolve the issue
- Indication of whether retry is possible

### 3. Retry Logic
- Automatic retry for transient failures (API rate limits)
- Manual retry buttons for user-actionable errors
- Maximum 3 retry attempts with exponential backoff

## Data Flow

### Input Processing
1. User submits YouTube URLs
2. URL validation and type detection
3. Parallel processing of multiple URLs
4. Real-time status updates

### Content Analysis
1. Fetch video/channel metadata from YouTube API
2. Extract transcripts (YouTube captions → Whisper fallback)
3. Send to Claude API for analysis
4. Generate summaries, key points, and topics
5. Store structured results in database

### Output Generation
1. Structured summaries with confidence scores
2. Extracted topics with relevance scores
3. Enhanced transcripts with timestamps
4. Cross-content topic relationships

## Security Considerations

### 1. API Key Management
- Environment variable storage
- Server-side only processing
- No client-side API key exposure

### 2. Database Security
- Row Level Security (RLS) enabled
- User data isolation
- Input validation and sanitization

### 3. Rate Limiting
- Built-in API rate limit handling
- Cost tracking and budget management
- Graceful degradation on quota limits

## Performance Optimization

### 1. Parallel Processing
- Concurrent video processing
- Batch API requests where possible
- Non-blocking UI updates

### 2. Caching Strategy
- Metadata caching to avoid re-fetching
- Transcript caching for reprocessing
- AI response caching for cost optimization

### 3. Database Optimization
- Proper indexing for common queries
- Efficient data types and constraints
- Optimized JSON storage for metadata

## Monitoring and Observability

### 1. Error Tracking
- Comprehensive error logging
- User-facing error reporting
- Retry attempt tracking

### 2. Cost Monitoring
- Real-time cost estimation
- Budget tracking and alerts
- Usage analytics per user

### 3. Performance Metrics
- Processing time tracking
- Success/failure rates
- API response times

## Deployment Architecture

### Production Setup
- **Frontend**: Vercel deployment
- **Database**: Supabase hosted PostgreSQL
- **APIs**: Next.js API routes on Vercel
- **Storage**: Supabase storage for media files

### Environment Configuration
- Development: Local Next.js + Supabase
- Staging: Vercel preview + Supabase staging
- Production: Vercel production + Supabase production

## Scaling Considerations

### Current Limitations
- Synchronous processing (no job queue)
- Single-tenant database design
- Memory-based status tracking

### Future Scaling Plans
- Background job processing with Redis/BullMQ
- Multi-tenant architecture with organization support
- Distributed AI processing with multiple providers
- CDN integration for media delivery