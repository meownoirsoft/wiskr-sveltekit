# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Wiskr is a modern, responsive web application for managing AI prompts and conversations across multiple AI models. Built with SvelteKit, it features conversation branching, project management, and AI integration.

**Tech Stack:**
- **Frontend:** SvelteKit 2.x + Svelte 5.0
- **Styling:** TailwindCSS 4.x with forms and typography plugins
- **Database:** Supabase (PostgreSQL) with real-time subscriptions
- **ORM:** Drizzle ORM (though currently minimal schema)
- **AI Integration:** OpenAI API
- **Authentication:** Supabase Auth
- **Build:** Vite 7.x with Tailwind CSS 4.x
- **Package Manager:** pnpm (fast, disk space efficient)

## Development Commands

### Core Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Start development server with browser open
pnpm run dev -- --open

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Code Quality
```bash
# Type checking
pnpm run check

# Type checking with watch mode
pnpm run check:watch

# Sync SvelteKit files
pnpm run prepare
```

### Database Management
```bash
# Push schema changes to database
pnpm run db:push

# Generate database migrations
pnpm run db:generate

# Run database migrations
pnpm run db:migrate

# Open Drizzle Studio (database GUI)
pnpm run db:studio
```

### Package Management
```bash
# Add a new dependency
pnpm add package-name

# Add a dev dependency
pnpm add -D package-name

# Remove a dependency
pnpm remove package-name

# Update dependencies
pnpm update

# Clean install (remove node_modules and reinstall)
pnpm run clean && pnpm install

# Check for outdated packages
pnpm outdated
```

## Architecture Overview

### Project Structure
```
src/
├── lib/                          # Shared utilities and components
│   ├── components/               # Reusable Svelte components
│   │   ├── ChatInterface.svelte  # Main chat UI
│   │   ├── ProjectSelector.svelte# Project management UI
│   │   ├── BranchModal.svelte    # Conversation branching
│   │   └── ...                   # Other UI components
│   ├── server/                   # Server-side utilities
│   │   ├── db/                   # Database configuration
│   │   │   ├── index.js          # Drizzle client setup
│   │   │   └── schema.js         # Database schema (minimal)
│   │   ├── openrouter.js         # AI API integration
│   │   └── supabaseAdmin.js      # Admin Supabase client
│   ├── client/                   # Client-side utilities
│   │   └── modelHelpers.js       # AI model configurations
│   ├── supabase.js               # Browser Supabase client
│   └── WiskrApp.svelte           # Main app component
├── routes/                       # SvelteKit routing
│   ├── +layout.svelte            # App layout with header/nav
│   ├── +layout.server.js         # Server-side layout data
│   ├── +page.svelte              # Home page
│   ├── login/                    # Authentication routes
│   ├── projects/                 # Project management
│   └── api/                      # API endpoints
│       ├── projects/             # Project CRUD operations
│       ├── sessions/             # Conversation session management
│       └── branches/             # Conversation branching
├── hooks.server.js               # SvelteKit hooks for auth
└── app.html                      # HTML template
```

### Key Architectural Patterns

**1. Supabase Integration**
- Authentication handled via `@supabase/ssr` in `hooks.server.js`
- Database operations through Supabase client, not Drizzle ORM
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data access control

**2. SvelteKit App Router**
- File-based routing in `src/routes/`
- API routes in `src/routes/api/` for backend functionality
- Server-side authentication checks in `+page.server.js` files
- Layout system for consistent UI structure

**3. Conversation Management System**
- **Projects**: Top-level containers for conversations
- **Sessions**: Time-based conversation groupings within projects
- **Branches**: Alternative conversation paths from any message
- **Messages**: Individual chat messages with role (user/assistant)
- Color-coded branches using rainbow system (8 predefined colors)

**4. Component Architecture**
- Highly modular components with clear separation of concerns
- Event-driven communication between components
- Custom CSS with Tailwind utility classes
- Dark mode support throughout the UI

**5. Database Design (Supabase)**
Key tables (not defined in local schema):
- `projects` - User projects with metadata
- `personas` - AI personality configurations  
- `conversation_sessions` - Time-based chat sessions
- `conversation_branches` - Alternative conversation paths
- `messages` - Chat messages with branching support
- `project_fact_types` - Custom fact categorization
- `project_questions` - Saved questions per project

## Environment Setup

Required environment variables:
```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database (for Drizzle, though currently using Supabase)
DATABASE_URL=your_postgres_connection_string
```

## Development Workflow

### Working with Database
- Primary database operations go through Supabase client, not Drizzle
- Schema changes should be made in Supabase dashboard first
- `src/lib/server/db/schema.js` is minimal and may not reflect full schema
- Use `pnpm run db:studio` for local database inspection

### Working with Authentication
- Authentication flows handled by Supabase Auth
- Server-side auth state in `hooks.server.js`
- Client-side auth state through Supabase browser client
- Protected routes check `locals.user` in load functions

### Adding New Features
1. API routes go in `src/routes/api/[feature]/+server.js`
2. UI components in `src/lib/components/[Feature].svelte`
3. Follow existing patterns for Supabase integration
4. Use TypeScript JSDoc comments for better IDE support

### Working with AI Integration
- OpenAI integration in `src/lib/server/openrouter.js`
- Model configurations in `src/lib/client/modelHelpers.js`
- Conversation state management through Supabase real-time

### Branch Management System
- Branches created from any message as a "branch point"
- Rainbow color system for visual distinction (8 colors cycling)
- Branch operations handled in `/api/branches/+server.js`
- UI components: `BranchModal.svelte` for branch management

This application emphasizes real-time collaboration, conversation flexibility through branching, and a clean, modern UI built with SvelteKit and Supabase.

## Troubleshooting

### pnpm Issues

If pnpm commands hang or crash:

1. **Test with timeout**: `timeout 30s pnpm install` to prevent infinite hangs
2. **Clear pnpm cache**: `pnpm store prune` then try again
3. **Clean install**: `rm -rf node_modules && pnpm install`
4. **Use verbose logging**: `pnpm install --loglevel=debug` to see where it hangs
5. **Check for lock file conflicts**: Remove any `package-lock.json` or `yarn.lock` files
6. **Rebuild packages**: `pnpm rebuild` after successful install
7. **Fallback to npm**: `rm -rf node_modules && npm install` if pnpm fails

Common pnpm advantages:
- **Faster installs**: Symlinks packages from global store
- **Disk space efficient**: Deduplicates packages across projects
- **Strict dependency resolution**: Prevents phantom dependencies
