# Phase.dev Secret Management Setup

This project uses [Phase.dev](https://phase.dev) to manage secrets and environment variables across different environments, replacing the need for local `.env` files.

## Why Phase.dev?

- **Centralized Management**: All secrets are managed in one place across dev, staging, and production
- **Team Collaboration**: No more sharing `.env` files via Slack or email
- **Security**: Secrets are encrypted and access-controlled
- **Environment Parity**: Consistent secret management across all environments

## Quick Setup

### 1. Install Phase CLI (if not already installed)

```bash
# The CLI is already installed in ~/.local/bin/phase/phase
# Add to your shell profile for convenience:
echo 'export PATH=$PATH:~/.local/bin/phase' >> ~/.bashrc
echo 'alias phase=~/.local/bin/phase/phase' >> ~/.bashrc
source ~/.bashrc
```

### 2. Authenticate with Phase

```bash
phase auth
```

This will open your browser to authenticate. Create an account at https://phase.dev if needed.

### 3. Initialize the Project

```bash
phase init
```

Choose to link to the existing "wiskr-sveltekit" app or create a new one.

### 4. Verify Setup

```bash
phase secrets list --env development
```

You should see the secrets for the development environment.

## Running the Application

### Development
```bash
# Using Phase (recommended)
pnpm run dev

# Legacy mode (if Phase is not set up yet)
pnpm run dev:legacy
```

### Building for Production
```bash
# Production build
pnpm run build

# Staging build
pnpm run build:staging
```

## Secret Management

### List Secrets
```bash
phase secrets list --env development
phase secrets list --env staging
phase secrets list --env production
```

### Add a New Secret
```bash
phase secrets create --env development --key "NEW_SECRET" --value "secret_value"
```

### Update a Secret
```bash
phase secrets update --env development --key "EXISTING_SECRET" --value "new_value"
```

### View Secret Values (be careful!)
```bash
phase secrets get --env development --key "SECRET_KEY"
```

## Environment Variables

The following environment variables are managed through Phase:

### Development Environment
- `PUBLIC_SUPABASE_URL`: Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `DATABASE_URL`: PostgreSQL connection string
- `PUBLIC_POSTHOG_KEY`: PostHog analytics key
- `PUBLIC_POSTHOG_HOST`: PostHog host URL

### Staging Environment
Same variables as development but with staging values.

### Production Environment
Same variables as development but with production values.

## Troubleshooting

### Command Not Found
If `phase` command is not found:
```bash
export PATH=$PATH:~/.local/bin/phase
alias phase=~/.local/bin/phase/phase
```

### Authentication Issues
Re-authenticate if needed:
```bash
phase auth
```

### Missing Secrets
Verify you have access to the environment:
```bash
phase secrets list --env development
```

Contact a team admin if you don't see any secrets.

## Team Onboarding

When a new team member joins:

1. They need to install the Phase CLI (already done in this project)
2. They need to authenticate: `phase auth`
3. They need to be added to the project by an admin
4. They can then run `phase init` to link to the project

## Migration from .env Files

If you have local `.env` files, you can migrate them to Phase:

```bash
# For each secret in your .env file
phase secrets create --env development --key "SECRET_NAME" --value "secret_value"
```

Then delete your local `.env` files as they're no longer needed.

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use environment-specific values**
3. **Rotate secrets regularly**
4. **Use least-privilege access**
5. **Audit secret access via Phase console**

## Getting Help

- Phase Documentation: https://docs.phase.dev
- Phase CLI Help: `phase --help`
- Project Issues: Create an issue in this repository
