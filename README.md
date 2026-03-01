# ERP Mini Project

A full-stack ERP (Enterprise Resource Planning) system built with Node.js, MongoDB, and AngularJS in a monorepo structure.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, MongoDB
- **Frontend**: AngularJS (1.x), Bootstrap 5
- **Database**: MongoDB (running in Docker)
- **Runtime**: [Bun](https://bun.sh)
- **Tooling**: Bun workspaces, Docker Compose

## Project Structure

```
erp-miniproject/
├── apps/
│   ├── api/              # Node.js/Express backend
│   └── frontend/         # AngularJS frontend
├── packages/
│   └── shared/           # Shared utilities and types
├── docker/
│   └── mongo-init.js     # MongoDB initialization script
├── docker-compose.yml    # Docker services configuration
├── bunfig.toml           # Bun configuration
├── package.json          # Root package.json
└── tsconfig.json         # Root TypeScript configuration
```

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Docker and Docker Compose

## Getting Started

### Quick Start (Automated)

```bash
./setup.sh
bun run dev
```

### Manual Setup

#### 1. Install Dependencies

```bash
bun install
```

#### 2. Start MongoDB (Docker)

```bash
# Start MongoDB and Mongo Express UI
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

MongoDB will be available at:
- MongoDB: `mongodb://localhost:27017`
- Mongo Express UI: http://localhost:8081 (admin/admin123)

#### 3. Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` if needed (defaults are configured for local Docker MongoDB).

#### 4. Run Development Servers

```bash
# Start both API and Frontend
bun run dev

# Or run individually
bun run dev:api      # Backend only (port 3000)
bun run dev:frontend # Frontend only (port 4200)
```

#### 5. Access the Application

- Frontend: http://localhost:4200
- API: http://localhost:3000
- API Health Check: http://localhost:3000/health
- Mongo Express: http://localhost:8081

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both API and frontend in development mode |
| `bun run dev:api` | Start backend only (with hot reload) |
| `bun run dev:frontend` | Start frontend only |
| `bun run build` | Build all packages |
| `docker-compose up -d` | Start MongoDB in Docker |
| `docker-compose down` | Stop Docker containers |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |
| `bun run clean` | Clean node_modules |

## Bun Features Used

- **Workspaces**: Monorepo package management
- **Hot Reload**: Built-in watch mode for TypeScript
- **Fast Install**: Optimized dependency installation
- **TypeScript**: Native TypeScript support

## MongoDB Configuration

The MongoDB setup includes:

- **Database**: `erp_db`
- **User**: `erp_user`
- **Password**: `erp_password`
- **Admin User**: `admin` / `password123`

Connection string:
```
mongodb://erp_user:erp_password@localhost:27017/erp_db?authSource=erp_db
```

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API information
- `POST /api/auth/login` - User login (to be implemented)
- `GET /api/products` - List products (to be implemented)
- `POST /api/products` - Create product (to be implemented)

## Development Tips

1. **MongoDB Data**: Data persists in Docker volumes even after container restart
2. **Hot Reload**: Both API and frontend support hot reload in development
3. **Shared Code**: Use `@erp/shared` package for common utilities and types
4. **Bun Speed**: Bun installs dependencies ~20x faster than npm

## Troubleshooting

### MongoDB connection issues

```bash
# Check MongoDB is running
docker ps | grep mongo

# View MongoDB logs
docker-compose logs -f mongodb

# Restart MongoDB
docker-compose down && docker-compose up -d
```

### Port conflicts

Edit ports in:
- `apps/api/.env` - Backend port (default: 3000)
- `docker-compose.yml` - MongoDB ports (default: 27017)
- `apps/frontend/package.json` - Frontend dev server (default: 4200)

## License

MIT
