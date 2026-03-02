# College ERP - Frontend

AngularJS frontend application for the College ERP System.

## Features

- **Landing Page**: Modern, responsive landing page showcasing the ERP features
- **Authentication**: Login and registration with JWT token management
- **Dashboard**: Role-based dashboard for students, faculty, and administrators
- **Responsive Design**: Mobile-first design using Bootstrap 4

## Tech Stack

- **Framework**: AngularJS v1.8.3
- **UI Library**: Bootstrap 4.6.2
- **Icons**: Font Awesome 5.15.4
- **HTTP Client**: Axios
- **Alerts**: SweetAlert2
- **Build Tool**: Vite 5
- **Runtime**: Bun / Node.js

## Project Structure

```
apps/frontend/
├── src/
│   ├── index.html              # Main HTML file
│   ├── app/
│   │   ├── app.module.js       # Angular app module
│   │   ├── app.config.js       # App configuration
│   │   ├── controllers/        # Angular controllers
│   │   │   ├── main.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── landing.controller.js
│   │   │   └── dashboard.controller.js
│   │   ├── services/           # Angular services
│   │   │   ├── auth.service.js
│   │   │   └── user.service.js
│   │   └── views/              # HTML views
│   │       ├── landing/
│   │       ├── auth/
│   │       └── dashboard/
│   └── assets/                 # Static assets
├── package.json
├── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+) or Bun runtime
- Backend API running on http://localhost:3000

### Installation

```bash
# From the root directory
cd apps/frontend

# Install dependencies
bun install

# or with npm
npm install
```

### Development

```bash
# Start development server
bun run dev

# or with npm
npm run dev
```

The application will be available at http://localhost:4200

### Production Build

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## Available Scripts

- `dev` - Start development server with hot reload
- `build` - Build for production
- `preview` - Preview production build locally

## Configuration

The API endpoint is configured in `src/app/app.config.js`:

```javascript
API_BASE_URL: 'http://localhost:3000/api'
```

To change the API endpoint, update this value.

## Authentication

The frontend uses JWT (JSON Web Tokens) for authentication:

- **Access Token**: Stored in cookies, expires in 1 hour
- **Refresh Token**: Stored in cookies, expires in 30 days
- **User Data**: Stored in cookies for quick access

### Authentication Flow

1. User logs in via `/login`
2. Server returns access and refresh tokens
3. Tokens are stored in HTTP-only cookies
4. All subsequent requests include the access token
5. Token is automatically refreshed when needed

## Routes

| Route | Authentication | Description |
|-------|---------------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login page |
| `/register` | Public | Registration page |
| `/dashboard` | Required | Main dashboard |
| `/profile` | Required | User profile |

## User Roles

- **student**: Can view enrolled courses, attendance, grades
- **faculty**: Can manage assigned courses, mark attendance
- **admin**: Full access to all system features

## Styling

The application uses a custom design system with CSS variables for easy theming:

- Primary Color: `#2563eb` (Blue)
- Secondary Color: `#1e40af` (Dark Blue)
- Success Color: `#10b981` (Green)
- Warning Color: `#f59e0b` (Orange)
- Danger Color: `#ef4444` (Red)

## API Integration

The frontend integrates with the backend API at `/api`:

- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/profile` - Get user profile
- **PUT** `/api/auth/profile` - Update profile

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Security Features

- JWT token storage in HTTP-only cookies
- Automatic token refresh
- Protected routes with authentication guards
- XSS protection
- CSRF protection (via backend)

## Development Notes

- Uses hash-based routing (`#!`) for better browser compatibility
- All controllers use `controllerAs` syntax for better scope management
- Services handle all HTTP requests
- SweetAlert2 for user-friendly alerts
- Bootstrap 4 for responsive layout

## Future Enhancements

- [ ] Complete dashboard for each role
- [ ] Student management interface
- [ ] Faculty management interface
- [ ] Course management interface
- [ ] Attendance marking interface
- [ ] Reports and analytics
- [ ] Real-time notifications
- [ ] File upload functionality
- [ ] Data tables with sorting/filtering
- [ ] Export to PDF/Excel

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the backend API is configured to allow requests from `http://localhost:4200`.

### Authentication Not Working

1. Check that the backend API is running on port 3000
2. Verify the API_BASE_URL in app.config.js
3. Check browser console for error messages
4. Clear browser cookies and try again

### Build Errors

If you encounter build errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules
bun install
```

## License

MIT
