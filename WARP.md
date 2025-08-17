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

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start development server with browser open
npm run dev -- --open

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality
```bash
# Type checking
npm run check

# Type checking with watch mode
npm run check:watch

# Sync SvelteKit files
npm run prepare
```

### Database Management
```bash
# Push schema changes to database
npm run db:push

# Generate database migrations
npm run db:generate

# Run database migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
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
- Use `npm run db:studio` for local database inspection

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
