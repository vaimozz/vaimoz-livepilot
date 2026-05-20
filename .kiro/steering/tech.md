# Tech Stack

## Frontend

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with PostCSS
- **UI Components**: Custom components using lucide-react icons
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Build Tool**: Vite with `@vitejs/plugin-react`
- **Path Alias**: `@/` maps to `client/src/`

## Backend

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT (jsonwebtoken) + bcryptjs for password hashing
- **File Upload**: Multer
- **External APIs**: googleapis (YouTube Data API v3)
- **Scheduling**: node-cron
- **CORS**: cors middleware

## External Dependencies

- **FFmpeg**: Required on host system or Docker container for video streaming
- **YouTube OAuth**: Requires Google Cloud Console credentials (CLIENT_ID, CLIENT_SECRET)

## Development Tools

- **Process Manager**: nodemon for backend hot reload
- **Concurrent Execution**: concurrently for running frontend + backend
- **Container**: Docker + docker-compose support

## Common Commands

### Development
```bash
npm run dev              # Run both frontend (5173) and backend (8787) concurrently
npm run client:dev       # Run frontend only
npm run server:dev       # Run backend only with nodemon
```

### Production
```bash
npm run build            # Build frontend to public/frontend/
npm start                # Start production server
```

### Database & Setup
```bash
npm run migrate          # Run database migrations
npm run seed:admin       # Create default admin user
npm run reset-password -- <username> <newpassword>
npm run generate-secret  # Generate JWT secret
npm run reset:data       # Reset all data (campaigns, assets, etc.)
```

### Docker
```bash
npm run docker:build     # Build Docker image
npm run docker:up        # Start with docker-compose
```

### Testing
```bash
npm run smoke:server     # Basic server smoke test
```

## Environment Variables

Required in `.env` file:
- `PORT`: Backend server port (default: 8787)
- `JWT_SECRET`: Secret for JWT token signing
- `CLIENT_ORIGIN`: Frontend URL for CORS
- `YOUTUBE_CLIENT_ID`: Google OAuth client ID
- `YOUTUBE_CLIENT_SECRET`: Google OAuth client secret
- `YOUTUBE_REDIRECT_URI`: OAuth callback URL

## Build Output

- Frontend builds to: `public/frontend/`
- Uploads stored in: `public/uploads/`
- Database file: `database.sqlite` (root directory)
