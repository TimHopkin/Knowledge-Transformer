# Deployment Guide

## Production Deployment (Vercel + Supabase)

### 1. Supabase Production Setup

1. **Create Production Project**
   ```bash
   # Go to supabase.com and create a new project
   # Note down your project URL and keys
   ```

2. **Apply Database Schema**
   ```bash
   # Link to your production project
   npx supabase link --project-ref YOUR_PROD_PROJECT_REF
   
   # Push migrations
   npx supabase db push
   ```

3. **Configure Environment Variables**
   Set up your production environment variables in Supabase dashboard.

### 2. Vercel Deployment

1. **Connect Repository**
   - Go to vercel.com and import your GitHub repository
   - Select Next.js framework preset

2. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_prod_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   NEXT_PUBLIC_BASE_URL=https://your-vercel-domain.vercel.app
   ```

3. **Deploy**
   ```bash
   # Push to main branch triggers automatic deployment
   git push origin main
   ```

### 3. Post-Deployment Setup

1. **Verify Database Connection**
   - Test API endpoints work correctly
   - Check Supabase logs for any connection issues

2. **Test Processing Pipeline**
   - Process a test video to verify full pipeline
   - Check error handling and retry mechanisms

3. **Monitor Costs**
   - Set up Anthropic API usage alerts
   - Monitor YouTube API quota usage

---

## Development Environment Setup

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd knowledge-transformer

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Set up local Supabase (optional)
npx supabase start

# Run development server
npm run dev
```

### Staging Environment
Use Vercel preview deployments for staging:
- Automatically created for every pull request
- Uses staging Supabase project
- Same configuration as production but with staging keys

---

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
- `ANTHROPIC_API_KEY`: Claude API key
- `YOUTUBE_API_KEY`: YouTube Data API key

### Optional
- `OPENAI_API_KEY`: For Whisper transcript fallback
- `NEXT_PUBLIC_BASE_URL`: Base URL for API calls
- `NODE_ENV`: Environment mode (development/production)

---

## Database Migrations

### Applying Migrations
```bash
# Development
npx supabase db reset

# Production
npx supabase db push
```

### Creating New Migrations
```bash
# Create new migration file
npx supabase migration new migration_name

# Edit the generated SQL file
# Apply with supabase db push
```

---

## Monitoring and Maintenance

### Health Checks
- API endpoint availability
- Database connection status
- External API service status

### Cost Monitoring
- Anthropic API usage tracking
- YouTube API quota monitoring
- Supabase database usage

### Performance Monitoring
- Processing time metrics
- Success/failure rates
- User experience analytics

### Backup Strategy
- Automatic Supabase daily backups
- Database migration version control
- Environment configuration backups

---

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check TypeScript errors
npm run build

# Check linting issues  
npm run lint
```

#### API Connection Issues
```bash
# Test database connection
npx supabase status

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### Processing Failures
- Check API key validity and quotas
- Verify network connectivity
- Review error logs in Supabase dashboard

### Debugging Tools
- Supabase dashboard logs
- Vercel function logs
- Browser developer tools
- Claude API usage dashboard

---

## Security Considerations

### Production Security
- Never commit API keys to version control
- Use Vercel environment variables for secrets
- Enable Supabase Row Level Security (RLS)
- Set up API rate limiting

### Data Privacy
- User data isolation in database
- Secure API key storage
- HTTPS enforcement
- No client-side secret exposure