# Project Structure

## Root Directory Layout

```
vaimoz-livepilot/
├── client/              # Frontend React application
├── db/                  # Database initialization and migrations
├── middleware/          # Express middleware (auth, error handling)
├── models/              # Database models (minimal, mostly in routes)
├── public/              # Static assets and build output
├── scripts/             # Utility scripts (migrate, seed, reset)
├── services/            # Business logic and API routes
├── utils/               # Shared utilities and helpers
├── views/               # Server-side views (if any)
├── app.js               # Main Express server entry point
└── database.sqlite      # SQLite database file

```

## Backend Organization

### `/services/`
Contains business logic organized by domain:
- `http/*.routes.js` - Express route handlers (auth, assets, campaigns, streams, etc.)
- `scheduler.js` - Campaign scheduling logic
- Other service modules for core functionality

### `/middleware/`
Express middleware functions:
- `auth.js` - JWT authentication and authorization
- `errorHandler.js` - Global error handling and 404 responses

### `/db/`
Database setup and management:
- `database.js` - Database initialization, connection, and logging
- Migration scripts

### `/utils/`
Shared utility functions:
- `config.js` - Environment configuration
- `asyncHandler.js` - Async route wrapper
- `serializers.js` - Data serialization helpers

### `/models/`
Database models (currently minimal, most queries in route files):
- Prepared for future MVC refactoring
- Currently logic resides in `services/http/*.routes.js`

### `/scripts/`
Standalone utility scripts:
- `migrate.js` - Run database migrations
- `seed-admin.js` - Create default admin user
- `reset-password.js` - Password reset utility
- `generate-secret.js` - Generate JWT secret
- `reset-data.js` - Clear database data

## Frontend Organization (`/client/`)

```
client/
├── src/
│   ├── app/              # Main app components and routing
│   │   ├── App.jsx       # Root component with auth state
│   │   └── AppRouter.jsx # Page routing logic
│   ├── components/       # Reusable UI components
│   │   ├── auth/         # Login/register components
│   │   ├── layout/       # TopBar, Sidebar, navigation
│   │   ├── shared/       # Badges, Cards, common UI
│   │   └── ui/           # Base UI primitives (button, card)
│   ├── features/         # Feature-specific page components
│   │   ├── analytics/    # Analytics dashboard
│   │   ├── assets/       # Asset library and upload
│   │   ├── campaign/     # Campaign creation and management
│   │   ├── dashboard/    # Main dashboard
│   │   ├── monitor/      # Stream monitoring
│   │   └── settings/     # User settings
│   ├── data/             # Mock data and navigation config
│   ├── lib/              # Utilities and API client
│   │   ├── api.js        # API client with auth handling
│   │   └── *Utils.js     # Feature-specific utilities
│   └── index.css         # Global styles and Tailwind imports
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Frontend dependencies

```

## Key Conventions

### File Naming
- **Routes**: `*.routes.js` for Express route modules
- **Components**: PascalCase `.jsx` files (e.g., `LoginPage.jsx`)
- **Utilities**: camelCase `.js` files (e.g., `asyncHandler.js`)
- **Config**: lowercase with dashes (e.g., `vite.config.js`)

### Import Patterns
- **Backend**: ES modules with `.js` extensions in imports
- **Frontend**: Path alias `@/` for `client/src/` directory
- **Relative imports**: Used for local modules

### Code Organization
- **Backend**: Route handlers contain most business logic (transitioning to MVC)
- **Frontend**: Feature-based organization with shared components
- **API Routes**: Prefixed with `/api/` and organized by resource

### Static Assets
- **Uploads**: Stored in `public/uploads/` and served at `/uploads`
- **Build Output**: Frontend builds to `public/frontend/`
- **Static Files**: Served from `public/` directory

### Database
- **Schema**: Defined in migration scripts under `db/`
- **Queries**: Direct SQL using better-sqlite3 prepared statements
- **Location**: `database.sqlite` in project root

## API Route Structure

All API routes follow the pattern: `/api/{resource}/{action}`

Example resources:
- `/api/auth` - Authentication endpoints
- `/api/assets` - Asset management
- `/api/campaigns` - Campaign CRUD
- `/api/streams` - Stream control
- `/api/playlists` - Playlist management
- `/api/youtube` - YouTube API integration
- `/api/monitor` - Monitoring and logs
- `/api/scheduler` - Scheduled campaigns
