# Contributing to Vaimoz LivePilot

First off, thank you for considering contributing to Vaimoz LivePilot! It's people like you that make this project better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, Node.js version, FFmpeg version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternative solutions** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js v18 or higher
- FFmpeg installed
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/vaimoz-livepilot.git
cd vaimoz-livepilot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate JWT secret
node scripts/generate-secret.js

# Run development server
npm run dev
```

### Project Structure

```
vaimoz-livepilot/
├── client/          # Frontend React application
├── db/              # Database initialization
├── middleware/      # Express middleware
├── services/        # Business logic and API routes
├── utils/           # Shared utilities
├── scripts/         # Utility scripts
└── app.js           # Main Express server
```

## Coding Standards

### JavaScript/Node.js

- Use **ES modules** (import/export)
- Use **async/await** for asynchronous code
- Follow **camelCase** for variables and functions
- Follow **PascalCase** for React components
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep functions **small and focused**

### React/Frontend

- Use **functional components** with hooks
- Keep components **small and reusable**
- Use **Tailwind CSS** for styling
- Follow the existing **component structure**
- Use **lucide-react** for icons

### Backend/API

- Use **Express Router** for routes
- Use **asyncHandler** wrapper for async routes
- Implement proper **error handling**
- Use **prepared statements** for database queries
- Add **authentication middleware** where needed
- Log important events using **logEvent()**

### Database

- Use **SQLite** with better-sqlite3
- Write **safe migrations** (ALTER TABLE ADD COLUMN IF NOT EXISTS)
- Use **prepared statements** to prevent SQL injection
- Keep schema changes **backward compatible**

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

**Examples:**
```
feat: add chatbot automation for YouTube live chat
fix: resolve FFmpeg process not stopping correctly
docs: update README with Telegram setup instructions
refactor: simplify campaign creation logic
test: add unit tests for telegramService
```

### Commit Prefixes

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

## Testing

Before submitting a pull request:

1. **Test your changes locally**
   ```bash
   npm run dev
   ```

2. **Check for syntax errors**
   ```bash
   npm run smoke:server
   ```

3. **Build the frontend**
   ```bash
   npm run build
   ```

4. **Test in production mode**
   ```bash
   npm start
   ```

5. **Test Docker build** (if applicable)
   ```bash
   npm run docker:build
   ```

## Documentation

- Update **README.md** if you change functionality
- Update **API documentation** if you add/modify endpoints
- Add **JSDoc comments** for complex functions
- Update **.env.example** if you add new environment variables

## Questions?

Feel free to:
- Open an issue with the `question` label
- Start a discussion in [GitHub Discussions](https://github.com/vaimozz/vaimoz-livepilot/discussions)
- Contact the maintainers

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- GitHub contributors page

Thank you for contributing to Vaimoz LivePilot! 🎉
