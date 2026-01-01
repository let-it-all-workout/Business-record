# NovaGadget Project Structure

This document describes the reorganized project structure.

## 📁 Directory Structure

```
Business-record/
├── backend/              # Backend server code
│   ├── database/         # Database files and migrations
│   │   ├── backups/      # Database backups
│   │   ├── migrations/   # Database migration scripts
│   │   ├── auth-schema.sql
│   │   ├── db.js         # Database connection and initialization
│   │   ├── business-record.db # SQLite database file
│   │   ├── schema.sql    # Main database schema
│   │   └── version.js   # Version management
│   ├── routes/           # API route handlers
│   │   ├── auth.js       # Authentication routes
│   │   ├── backup.js     # Backup management routes
│   │   ├── inventory.js  # Inventory routes
│   │   ├── products.js   # Product routes
│   │   ├── sales.js      # Sales routes
│   │   └── settings.js   # Settings routes
│   ├── scripts/          # Utility scripts
│   │   ├── private/      # Private scripts (may contain sensitive info)
│   │   ├── backup-db.js
│   │   ├── clear-database.js
│   │   ├── migrate.js
│   │   ├── pre-update-check.js
│   │   ├── reset-admin-password.js
│   │   └── reset-password.js
│   └── index.js          # Main server entry point
│
├── frontend/             # Frontend React application
│   ├── public/           # Static assets
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   ├── constants/    # Constants and configurations
│   │   ├── contexts/     # React contexts (Auth, etc.)
│   │   ├── utils/        # Utility functions
│   │   ├── index.css     # Global styles
│   │   ├── main.tsx      # Application entry point
│   │   └── types.ts      # TypeScript type definitions
│   └── index.html        # HTML template
│
├── backend/             # Backend server code
│   ├── database/        # Database files and migrations
│   ├── routes/          # API route handlers
│   ├── scripts/         # Utility scripts
│   ├── index.js         # Main server entry point
│   ├── Procfile         # Railway start command
│   └── railway.json     # Railway configuration
│
├── frontend/            # Frontend React application
│   ├── public/          # Static assets
│   ├── src/             # Source code
│   ├── index.html       # HTML template
│   ├── postcss.config.js    # PostCSS configuration
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── tsconfig.json        # TypeScript configuration
│   ├── tsconfig.node.json   # TypeScript node configuration
│   ├── vercel.json          # Vercel configuration
│   └── vite.config.ts      # Vite build configuration
│
├── readme/              # Documentation files
│   └── *.md             # All markdown documentation
│
├── dist/                # Build output (generated)
├── node_modules/        # Dependencies
├── .gitignore          # Git ignore rules
├── package.json         # Project configuration and scripts
└── package-lock.json    # Dependency lock file
```

## 🔧 Configuration Files

### Backend Configuration
- **Entry Point:** `backend/index.js`
- **Database:** `backend/database/business-record.db`
- **Port:** 3002 (configurable via `PORT` environment variable)

### Frontend Configuration
- **Entry Point:** `frontend/src/main.tsx`
- **HTML Template:** `frontend/index.html`
- **Build Output:** `dist/`
- **Dev Server Port:** 5173

## 📝 NPM Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run server           # Start backend server
npm run dev:full         # Start both frontend and backend

# Build
npm run build            # Build frontend for production
npm run preview          # Preview production build

# Server Management
npm run server:stop      # Stop backend server
npm run server:restart   # Restart backend server

# Database
npm run migrate          # Run database migrations
npm run backup          # Create database backup
npm run pre-update-check # Check before updating
npm run safe-update     # Safe update process
```

## 🔄 Migration from Old Structure

The project has been reorganized from:
- `server/` → `backend/`
- `src/` → `frontend/src/`
- `public/` → `frontend/public/`
- `index.html` → `frontend/index.html`
- Configuration files moved to respective folders:
  - `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `vercel.json` → `frontend/`
  - `railway.json`, `Procfile`, `start-server.sh` → `backend/`
  - All `.md` files → `readme/`

All import paths and configurations have been updated to reflect the new structure.

## 📦 Key Features

### Backend
- Express.js REST API
- SQLite database with migrations
- Authentication and authorization
- Rate limiting
- CORS protection
- Security headers

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS
- PWA support
- Responsive design

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development:**
   ```bash
   npm run dev:full
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3002

## 📚 Documentation

- `README.md` - Main project documentation
- `SECURITY_AUDIT_RESULTS.md` - Security audit findings
- `PASSWORD_RESET_GUIDE.md` - Password reset instructions
- `USER_SYSTEM_GUIDE.md` - User management guide

