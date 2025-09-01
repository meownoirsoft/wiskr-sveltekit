#!/bin/bash

# Script to add secrets from .env.example to Phase.dev
# Run this after setting up Phase authentication and project initialization

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Phase CLI path
export PATH=$PATH:~/.local/bin/phase
alias phase=~/.local/bin/phase/phase

echo -e "${BLUE}🔐 Adding Secrets to Phase.dev${NC}"
echo "========================================"
echo ""

# Array of secrets from .env.example
declare -a secrets=(
    "PUBLIC_SUPABASE_URL"
    "PUBLIC_SUPABASE_ANON_KEY"
    "DATABASE_URL"
    "PUBLIC_POSTHOG_KEY"
    "PUBLIC_POSTHOG_HOST"
)

# Array of environments
declare -a environments=("development" "staging" "production")

echo -e "${YELLOW}This script will add the following secrets to Phase:${NC}"
for secret in "${secrets[@]}"; do
    echo "  - $secret"
done
echo ""

echo -e "${YELLOW}For the following environments:${NC}"
for env in "${environments[@]}"; do
    echo "  - $env"
done
echo ""

read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Function to add secret
add_secret() {
    local env=$1
    local key=$2
    
    echo -e "${BLUE}Adding $key to $env environment...${NC}"
    echo "Please enter the value for $key in $env environment:"
    read -s value
    
    if [ -n "$value" ]; then
        phase secrets create --env "$env" --key "$key" --value "$value"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Successfully added $key to $env${NC}"
        else
            echo -e "${RED}✗ Failed to add $key to $env${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Skipping empty value for $key in $env${NC}"
    fi
    echo ""
}

# Add secrets for each environment
for env in "${environments[@]}"; do
    echo -e "${BLUE}Setting up $env environment...${NC}"
    echo "============================================"
    
    for secret in "${secrets[@]}"; do
        add_secret "$env" "$secret"
    done
    
    echo -e "${GREEN}✓ Completed $env environment${NC}"
    echo ""
done

echo -e "${GREEN}🎉 Secret setup complete!${NC}"
echo ""
echo "You can verify the secrets were added by running:"
echo "  phase secrets list --env development"
echo "  phase secrets list --env staging"
echo "  phase secrets list --env production"
echo ""
echo "To run your development server with secrets:"
echo "  pnpm run dev"
