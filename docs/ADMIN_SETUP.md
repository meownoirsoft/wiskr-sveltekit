# Admin Server Setup

This project now supports running the admin interface on a separate port for better development workflow and deployment flexibility.

## Development Scripts

### Main App (Port 5173)
```bash
npm run dev
```
Runs the main Wiskr application on `http://localhost:5173`

### Admin Server (Port 5174)
```bash
npm run dev:admin
```
Runs only the admin interface on `http://localhost:5174`

### Both Servers Simultaneously
```bash
npm run dev:both
```
Runs both the main app and admin server concurrently for full development workflow.

## URL Structure

- **Main App**: `http://localhost:5173` - User-facing application
- **Admin Server**: `http://localhost:5174` - Admin dashboard and tools
- **Debug Tools**: `http://localhost:5174/debug-context` - API debugging interface

## Benefits

1. **Parallel Development**: Work on admin features without affecting main app
2. **Isolated Testing**: Test admin functionality independently
3. **Better Security**: Admin routes can be deployed separately with different security configurations
4. **Performance**: Admin-heavy operations don't impact main user experience
5. **Scalability**: Can scale admin and main app servers independently

## Architecture

### Shared Components
- Database connections (`src/lib/server/`)
- Authentication utilities (`src/lib/auth/`)
- API utilities (`src/lib/server/`)
- Shared UI components (`src/lib/components/`)

### Admin-Specific
- Admin routes (`src/routes/admin/`)
- Admin layout (`AdminLayout.svelte`)
- Admin configuration (`vite.admin.config.js`)

## Configuration Files

- `vite.admin.config.js` - Vite configuration for admin server
- `svelte.admin.config.js` - SvelteKit configuration for admin routes
- `.env.admin` - Admin-specific environment variables

## Debugging

Use the debug page at `http://localhost:5174/debug-context` to test the context analysis API without authentication requirements.

## Production Deployment

The admin server can be built and deployed separately:

```bash
npm run build:admin        # Build admin server
npm run preview:admin      # Preview admin build
```

This allows for:
- Different deployment configurations
- Separate scaling policies
- Enhanced security isolation
- Independent update cycles

## Troubleshooting

1. **Port Conflicts**: If ports 5173/5174 are in use, modify the port in `vite.admin.config.js`
2. **Missing Dependencies**: Run `npm install` to ensure `concurrently` is installed
3. **Authentication Issues**: Ensure both servers use the same Supabase configuration
4. **CORS Issues**: Both servers should share the same origin for API calls
