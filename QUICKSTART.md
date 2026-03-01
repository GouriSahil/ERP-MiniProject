# Quick Start Guide

## Option 1: Automated Setup

Run the setup script to install dependencies and start MongoDB:

```bash
./setup.sh
```

Then start the development servers:

```bash
bun run dev
```

## Option 2: Manual Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Start MongoDB

```bash
docker-compose up -d
```

### 3. Start Development Servers

```bash
bun run dev
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:4200 | - |
| Backend API | http://localhost:3000 | - |
| Health Check | http://localhost:3000/health | - |
| Mongo Express UI | http://localhost:8081 | admin/admin123 |

## Project Structure Overview

```
erp-miniproject/
├── apps/
│   ├── api/                 # Backend (Node.js/Express/TypeScript)
│   │   ├── src/
│   │   │   ├── config/      # Database configuration
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── models/      # Mongoose models
│   │   │   ├── routes/      # API routes
│   │   │   ├── middleware/  # Express middleware
│   │   │   └── server.ts    # App entry point
│   │   └── .env             # Environment variables
│   │
│   └── frontend/            # Frontend (AngularJS)
│       └── app/
│           ├── index.html   # Main HTML
│           ├── app.module.js # Angular module
│           ├── app.routes.js # UI Router config
│           ├── components/   # Controllers
│           ├── services/     # API services
│           └── views/        # HTML templates
│
├── packages/
│   └── shared/              # Shared utilities
│       └── src/
│           └── index.ts     # Types, helpers, error classes
│
├── docker/
│   └── mongo-init.js        # MongoDB initialization
├── docker-compose.yml       # Docker services
├── bunfig.toml             # Bun configuration
├── package.json             # Root workspace config
└── setup.sh                 # Setup script
```

## Development Workflow

### Making Changes

1. **Backend changes**: Edit files in `apps/api/src/` - Bun's watch mode will auto-restart
2. **Frontend changes**: Edit files in `apps/frontend/app/` - browser will auto-refresh
3. **Shared code**: Edit `packages/shared/src/` then run `bun run --filter @erp/shared build`

### Database Operations

View and manage data via Mongo Express UI at http://localhost:8081

Or use MongoDB shell:

```bash
docker exec -it erp-mongodb mongosh
> use erp_db
> db.products.find()
> db.categories.find()
```

### Stopping Services

```bash
# Stop development servers
Ctrl + C

# Stop MongoDB
docker-compose down

# Stop everything
docker-compose down
# Then kill any running bun processes
```

## Troubleshooting

### MongoDB won't start

```bash
# Check Docker logs
docker-compose logs mongodb

# Restart containers
docker-compose down
docker-compose up -d
```

### API can't connect to MongoDB

1. Ensure MongoDB is running: `docker ps | grep mongo`
2. Check connection string in `apps/api/.env`
3. View API logs for detailed errors

### Port conflicts

Edit ports in:
- `apps/api/.env` - Change `PORT=3000`
- `docker-compose.yml` - Change MongoDB ports
- `apps/frontend/package.json` - Change frontend port

## Bun-Specific Commands

```bash
# Install dependencies
bun install

# Run development
bun run dev

# Run tests
bun test

# Build package
bun run build

# Run specific workspace
bun run --filter @erp/api dev
bun run --filter @erp/frontend dev

# Clean install
rm -rf node_modules bun.lockb
bun install
```

## Next Steps

1. Implement authentication in the backend
2. Create product management CRUD operations
3. Build out the order management system
4. Add more frontend controllers for each view
5. Implement error handling and validation

Happy coding! 🚀
