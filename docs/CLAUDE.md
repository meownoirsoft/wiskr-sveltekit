# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
This project uses Phase.dev for secret management. Commands are prefixed with `phase run --env <environment>`:

- **Development**: `pnpm run dev` - Start development server using Phase environment
- **Legacy dev**: `pnpm run dev:legacy` - Development without Phase
- **Fast dev**: `pnpm run dev:fast` - Development with forced cache clearing
- **Admin panel**: `pnpm run admin` - Start admin interface on port 5174
- **Both apps**: `pnpm run dev:both` - Run main app and admin concurrently

### Build Commands
- **Production build**: `pnpm run build`
- **Staging build**: `pnpm run build:staging`
- **Admin build**: `pnpm run build:admin`
- **Both builds**: `pnpm run build:both`


### Code Quality
- **Type checking**: `pnpm run check` - Run Svelte type checking
- **Fast check**: `pnpm run check:fast` - Type checking without sync
- **Watch mode**: `pnpm run check:watch` - Continuous type checking

### Utilities
- **Clean**: `pnpm run clean` - Remove build artifacts and cache
- **Fresh start**: `pnpm run fresh` - Clean, install deps, and start dev
- **Bundle analysis**: `pnpm run analyze` - Analyze production bundle

## Architecture Overview

### Tech Stack
- **Frontend**: SvelteKit 5 with Tailwind CSS 4
- **Backend**: SvelteKit API routes with server-side rendering
- **Database**: PostgreSQL with Supabase client
- **Auth**: Supabase Auth with RLS policies
- **AI**: OpenAI and OpenRouter API integrations
- **Analytics**: PostHog
- **Secret Management**: Phase.dev

### Core Application Structure

**Main App** (`src/routes/`):
- Authentication-based routing with protected routes
- Project-based workspace organization
- Real-time chat interface with multiple AI models
- Branching conversation system
- Context management with entity detection

**Admin Panel** (`src/routes/admin/`):
- Separate admin interface with its own build config
- User management and system analytics
- Import/export functionality for projects
- Context quality monitoring

### Key Components

**Authentication Flow** (`src/hooks.server.js`):
- Server-side auth handling with Supabase SSR
- OAuth callback processing
- User session management across requests

**Database Layer**:
- Direct Supabase client usage
- SQL migrations in `src/lib/migrations/`
- Row Level Security (RLS) for data access control

**AI Integration** (`src/lib/server/`):
- OpenAI and OpenRouter API clients
- Response processing and streaming
- Auto-titling and entity detection services

**Project System**:
- Multi-tenant project isolation with RLS
- Conversation branching and session management
- Context scoring and entity card generation
- Import/export with multiple format support

### State Management
- Svelte 5 runes for reactive state
- Server-side data loading through `+page.server.js` files
- Real-time updates via Supabase subscriptions

### Development Notes
- Uses Phase.dev for environment variable management across dev/staging/prod
- Dual app architecture: main app + admin panel with separate configs
- Virtual message scrolling for performance optimization
- Component-based architecture with reusable UI components in `src/lib/components/`

### Database Schema
- Multi-user system with project isolation
- Conversation branching with sessions and branches
- Entity cards and context scoring
- Row Level Security (RLS) policies for data access control