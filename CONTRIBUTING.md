# Contributing to Knowledge Transformer

Thank you for your interest in contributing to Knowledge Transformer! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/knowledge-transformer.git
   cd knowledge-transformer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Code Style

### TypeScript
- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use interfaces for object types
- Follow naming conventions: PascalCase for types, camelCase for variables

### React Components
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused
- Use TypeScript interfaces for props

### API Routes
- Follow RESTful conventions
- Use proper HTTP status codes
- Include comprehensive error handling
- Document all endpoints

## Error Handling Standards

### Error Classification
All errors should be properly classified with:
- Specific error type
- User-friendly message
- Suggested action
- Retry capability indication

### Error Response Format
```typescript
interface ErrorResponse {
  error: string
  errorDetails: {
    message: string
    userFriendlyMessage: string
    suggestedAction: string
    canRetry: boolean
  }
}
```

## Database Guidelines

### Migrations
- Always create migrations for schema changes
- Use descriptive migration names
- Include rollback procedures
- Test migrations on staging first

### Queries
- Use proper indexing for performance
- Implement Row Level Security (RLS)
- Avoid N+1 query problems
- Use transactions for multi-step operations

## Testing

### Required Tests
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for UI functionality
- End-to-end tests for critical user flows

### Testing Commands
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## Pull Request Process

### Before Submitting
1. Ensure all tests pass
2. Run linting and type checking
3. Update documentation if needed
4. Add/update tests for new features

### Pull Request Requirements
1. **Clear Description**: Explain what the PR does and why
2. **Linked Issue**: Reference related GitHub issues
3. **Testing**: Describe how you tested the changes
4. **Breaking Changes**: Call out any breaking changes

### Review Process
1. Automated checks must pass (CI/CD)
2. At least one code review required
3. Documentation review if applicable
4. Manual testing for UI changes

## Issue Reporting

### Bug Reports
Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or videos if applicable
- Environment details (OS, browser, Node version)
- Error messages and stack traces

### Feature Requests
Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Acceptance criteria

## Development Workflow

### Branch Naming
- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`
- Refactor: `refactor/description`

### Commit Messages
Follow conventional commit format:
```
type(scope): description

feat(youtube): add channel processing support
fix(api): handle transcript extraction errors
docs(readme): update setup instructions
refactor(db): optimize content queries
```

### Code Review Checklist

#### Functionality
- [ ] Code works as intended
- [ ] Edge cases are handled
- [ ] Error handling is comprehensive
- [ ] Performance considerations addressed

#### Code Quality
- [ ] Code is readable and well-organized
- [ ] Follows project conventions
- [ ] No code duplication
- [ ] Proper TypeScript types

#### Testing
- [ ] New functionality has tests
- [ ] Existing tests still pass
- [ ] Integration tests cover API changes
- [ ] Manual testing completed

#### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic has comments
- [ ] API changes are documented
- [ ] README updated if needed

## Release Process

### Version Numbering
Follow semantic versioning (semver):
- Major: Breaking changes
- Minor: New features, backwards compatible
- Patch: Bug fixes, backwards compatible

### Release Steps
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release PR
4. Tag release after merge
5. Deploy to production

## Getting Help

### Resources
- Project documentation in `/docs`
- API documentation in `/docs/API.md`
- Architecture overview in `/docs/ARCHITECTURE.md`

### Community
- GitHub Issues for bugs and feature requests
- GitHub Discussions for questions and ideas
- Code review feedback for improvements

### Maintainers
Current maintainers are listed in the GitHub repository settings.