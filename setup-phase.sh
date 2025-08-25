#!/bin/bash

# Phase.dev Integration Setup for Wiskr SvelteKit
# This script helps set up Phase.dev secret management

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Phase CLI path
export PATH=$PATH:~/.local/bin/phase
alias phase=~/.local/bin/phase/phase

echo -e "${BLUE}🔐 Phase.dev Setup for Wiskr SvelteKit${NC}"
echo "================================================="
echo ""

echo -e "${YELLOW}Step 1: Authentication${NC}"
echo "Please run: phase auth"
echo "This will open your browser to authenticate with Phase.dev"
echo "If you don't have an account, you can create one at https://phase.dev"
echo ""

echo -e "${YELLOW}Step 2: Initialize Project${NC}"
echo "After authentication, run: phase init"
echo "This will create a new app or link to an existing one"
echo ""

echo -e "${YELLOW}Step 3: Create Environments${NC}"
echo "You'll need to create these environments in Phase:"
echo "  - development"
echo "  - staging"
echo "  - production"
echo ""

echo -e "${YELLOW}Step 4: Add Secrets${NC}"
echo "Based on your .env.example, you'll need to add these secrets:"
echo "  - PUBLIC_SUPABASE_URL"
echo "  - PUBLIC_SUPABASE_ANON_KEY"
echo "  - DATABASE_URL"
echo "  - PUBLIC_POSTHOG_KEY"
echo "  - PUBLIC_POSTHOG_HOST"
echo ""

echo -e "${GREEN}Quick commands:${NC}"
echo "  phase auth                    # Authenticate with Phase"
echo "  phase init                    # Initialize project"
echo "  phase secrets create          # Create a new secret"
echo "  phase secrets list            # List all secrets"
echo "  phase run 'npm run dev'       # Run with secrets injected"
echo ""

echo -e "${BLUE}Ready to start? Run: phase auth${NC}"
