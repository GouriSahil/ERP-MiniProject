# Quick Start Guide

This guide will help you set up and run the College ERP System on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** (recommended) or Node.js v18+
  - Install Bun: `curl -fsSL https://bun.sh/install | bash`
  - Or install Node.js: https://nodejs.org/
- **MongoDB** (local or MongoDB Atlas)
  - Local: https://www.mongodb.com/try/download/community
  - Atlas: https://www.mongodb.com/cloud/atlas

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd ERP-MiniProject

# Install all dependencies
bun install
```

### 2. Configure Backend API

```bash
# Navigate to API directory
cd apps/api

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - MONGODB_URI (your MongoDB connection string)
# - JWT_ACCESS_SECRET (generate a random secret)
# - JWT_REFRESH_SECRET (generate another random secret)
```

Example `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/erp-db
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
NODE_ENV=development
```

### 3. Start MongoDB

If using local MongoDB:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Start MongoDB as a service
```

### 4. Run the Application

You have two options:

#### Option A: Run Both API and Frontend Together

```bash
# From the root directory
bun run dev
```

This will start:
- Backend API on http://localhost:3000
- Frontend on http://localhost:4200

#### Option B: Run Separately

Terminal 1 - Backend:
```bash
bun run dev:api
```

Terminal 2 - Frontend:
```bash
bun run dev:frontend
```

## Access the Application

Once running:

- **Frontend:** http://localhost:4200
- **API Health Check:** http://localhost:3000/api/health
- **API Base URL:** http://localhost:3000/api

## Default Test Credentials

After starting the API, you can register a new account or use these test credentials (if you've seeded the database):

**Admin:**
- Email: admin@college.edu
- Password: admin123

**Student:**
- Email: student@college.edu
- Password: student123

## Troubleshooting

### Port Already in Use

If you see "port already in use" error:

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### MongoDB Connection Failed

- Ensure MongoDB is running
- Check your MONGODB_URI in .env
- Verify MongoDB is accessible on the specified port

### Frontend Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
bun install
```

### CORS Issues

If you see CORS errors in the browser console:

1. Check that the backend API is running
2. Verify the API URL in `apps/frontend/src/app/app.config.js`
3. Check CORS configuration in backend

## Development Tips

### Hot Reload

Both API and frontend support hot reload during development. Changes will be reflected automatically.

### Debugging

- **Backend:** Add `console.log()` or use a debugger (VS Code debugger works well)
- **Frontend:** Use Chrome DevTools (F12) for debugging AngularJS code

### Viewing API Logs

Backend logs are shown in the terminal. For frontend, use the browser console.

## Production Build

To build for production:

```bash
# Build both
bun run build

# Or build separately
bun run build:api
bun run build:frontend
```

Production build artifacts:
- **API:** `apps/api/dist/`
- **Frontend:** `apps/frontend/dist/`

## Next Steps

1. ✅ Application is running
2. 📝 Read the [SRS](docs/SRS.md) for requirements
3. 🔐 Explore API documentation in `apps/api/README.md`
4. 🎨 Customize the frontend in `apps/frontend/`

## Support

For issues or questions:
- Check the documentation in `docs/`
- Review IMPLEMENTATION_STATUS.md for feature status
- Check logs in the terminal

---

**Happy Coding!** 🚀
