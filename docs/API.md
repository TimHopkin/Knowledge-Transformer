# API Documentation

## Overview
The Knowledge Transformer API provides endpoints for processing YouTube content and managing the resulting structured data.

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
Currently using placeholder authentication. Future versions will implement Supabase Auth.

---

## Endpoints

### YouTube Processing

#### POST `/api/youtube/process`
Process YouTube URLs (videos, channels, playlists) and generate AI analysis.

**Request Body:**
```json
{
  "urls": [
    "https://www.youtube.com/watch?v=VIDEO_ID",
    "https://www.youtube.com/channel/CHANNEL_ID",
    "https://www.youtube.com/@channel_handle"
  ],
  "options": {
    "maxVideos": 10,
    "extractTopics": true,
    "summaryLength": "medium",
    "summaryFocus": "key_points"
  }
}
```

**Options:**
- `maxVideos`: Maximum videos to process per channel (1-50, default: 10)
- `extractTopics`: Whether to extract topics (default: true)
- `summaryLength`: "short" | "medium" | "long" (default: "medium")
- `summaryFocus`: "overview" | "key_points" | "actionable" (default: "key_points")

**Response:**
```json
{
  "success": true,
  "processed": [
    {
      "type": "video",
      "id": "VIDEO_ID", 
      "title": "Video Title",
      "status": "completed",
      "contentItemId": "uuid",
      "estimatedCost": 0.045,
      "summary": "Brief summary title",
      "topicsCount": 5
    }
  ],
  "errors": [
    {
      "url": "https://youtube.com/...",
      "error": "Video not found",
      "errorDetails": {
        "userFriendlyMessage": "This video has been deleted or made private",
        "suggestedAction": "Try a different video URL",
        "canRetry": false
      }
    }
  ],
  "totalEstimatedCost": 0.045,
  "message": "Processed 1 items, 1 errors"
}
```

#### POST `/api/youtube/retry`
Retry processing for a failed content item.

**Request Body:**
```json
{
  "contentItemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Retry initiated successfully",
  "result": { /* Processing result */ }
}
```

### Content Management

#### GET `/api/content`
Retrieve processed content items with pagination and filtering.

**Query Parameters:**
- `limit`: Number of items (1-100, default: 20)
- `offset`: Pagination offset (default: 0)  
- `status`: Filter by processing status
- `search`: Search in titles and summaries
- `source_type`: Filter by source type

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Video Title",
      "description": "Video description",
      "duration": 1440,
      "publishedAt": "2024-01-01T00:00:00Z",
      "processingStatus": "completed",
      "currentStep": "completed",
      "summary": {
        "title": "Summary Title",
        "content": "Summary content...",
        "keyPoints": ["Point 1", "Point 2"]
      },
      "topics": [
        {
          "name": "Topic Name",
          "confidence": 0.95,
          "keywords": ["keyword1", "keyword2"]
        }
      ]
    }
  ],
  "total": 150,
  "hasMore": true
}
```

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "step": "ai_processing",
    "timestamp": "2024-01-01T00:00:00Z",
    "canRetry": true
  }
}
```

### Common Error Codes

#### YouTube API Errors
- `YOUTUBE_QUOTA_EXCEEDED`: API quota limit reached
- `VIDEO_NOT_FOUND`: Video has been deleted or is private
- `CHANNEL_NOT_FOUND`: Invalid channel URL or handle
- `VIDEO_PRIVATE`: Video is private or restricted

#### Transcript Errors
- `NO_CAPTIONS_AVAILABLE`: Video has no captions or subtitles
- `TRANSCRIPT_EXTRACTION_FAILED`: Technical error during extraction
- `LANGUAGE_UNSUPPORTED`: Captions in unsupported language

#### AI Processing Errors
- `CLAUDE_RATE_LIMIT`: Claude API rate limit exceeded
- `CLAUDE_TOKEN_LIMIT`: Content too long for processing
- `CLAUDE_QUOTA_EXCEEDED`: Monthly API quota exceeded
- `AI_PROCESSING_TIMEOUT`: Processing took too long

#### Database Errors
- `DATABASE_CONNECTION_ERROR`: Cannot connect to database
- `DATA_VALIDATION_ERROR`: Invalid data format
- `STORAGE_QUOTA_EXCEEDED`: Database storage limit reached

---

## Rate Limits

### YouTube API
- 10,000 quota units per day per project
- ~100 video details requests per day
- Automatically handled with exponential backoff

### Claude API
- Model-specific rate limits
- Automatic retry with exponential backoff
- Cost tracking to prevent budget overruns

### Application Limits
- Maximum 50 URLs per batch request
- Maximum 50 videos per channel processing
- 3 retry attempts per failed item

---

## Status Codes

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing/invalid API keys)
- `403`: Forbidden (quota exceeded)
- `404`: Not Found (content not available)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## Processing Status Values

### Current Step
- `pending`: Queued for processing
- `fetching_metadata`: Getting video/channel information
- `extracting_transcript`: Extracting captions/audio
- `ai_processing`: AI analysis in progress
- `saving_data`: Saving results to database
- `completed`: Processing finished successfully
- `failed`: Processing failed (see error details)

### Overall Status
- `pending`: Not yet started
- `processing`: Currently being processed
- `completed`: Successfully finished
- `failed`: Processing failed with specific error details