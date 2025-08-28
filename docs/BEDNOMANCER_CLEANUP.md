# BEDNOMANCER Project Cleanup

This directory contains scripts to clean up legacy "BEDNOMANCER" projects from the database while ensuring new users get a clean slate with the new "My First Project" welcome experience.

## Important Note

⚠️ **PRESERVES DATA FOR ry@nrwl.xyz** - These scripts are specifically designed to keep all BEDNOMANCER projects belonging to the user with email `ry@nrwl.xyz` intact.

## Current New User Experience

New users now automatically get a fresh project called **"My First Project"** with a welcoming description when they first visit the projects page and have no existing projects. This is implemented in `src/routes/projects/+page.svelte` (lines 238-261).

## Available Cleanup Methods

### Method 1: Node.js Script (Recommended)

```bash
# Install dependencies if needed
npm install @supabase/supabase-js dotenv

# Set up environment variables
# Make sure you have these in your .env file:
# PUBLIC_SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the cleanup script
node scripts/cleanup-bednomancer.js
```

The Node.js script will:
- ✅ Find and preserve BEDNOMANCER projects for ry@nrwl.xyz
- ✅ Clean up all other BEDNOMANCER projects and their associated data
- ✅ Provide detailed logging of what was cleaned and what was preserved
- ✅ Verify the cleanup was successful

### Method 2: SQL Script (Manual)

```sql
-- Run this in your Supabase SQL editor or database client
\i cleanup_bednomancer_projects.sql
```

## What Gets Cleaned Up

For each BEDNOMANCER project (except those belonging to ry@nrwl.xyz):
- Messages
- Facts  
- Docs
- Conversation branches
- Conversation sessions
- Project questions
- The project itself

## Verification

After running either script, you can verify the cleanup worked by checking:

1. **New users** should automatically get "My First Project" when they first visit `/projects`
2. **Existing users** with BEDNOMANCER projects (except ry@nrwl.xyz) should no longer see them
3. **ry@nrwl.xyz** should still have all their BEDNOMANCER projects intact

## Testing New User Flow

To test the new user experience:
1. Create a test user account
2. Navigate to `/projects`
3. Verify that "My First Project" is automatically created
4. Verify the project has the welcome description: "Welcome to Wiskr! This is your first project to get you started."

## Files Created

- `scripts/cleanup-bednomancer.js` - Node.js cleanup script
- `cleanup_bednomancer_projects.sql` - SQL cleanup script
- `BEDNOMANCER_CLEANUP.md` - This documentation

## Safety Features

- ✅ Preserves ry@nrwl.xyz's BEDNOMANCER projects
- ✅ Only targets projects with "BEDNOMANCER" in name or description
- ✅ Cleans up associated data in the correct order
- ✅ Provides verification queries
- ✅ Detailed logging of actions taken

## RLS Policy Fix

🔧 **IMPORTANT**: A Row Level Security (RLS) policy fix has been applied to resolve the error:
```
Error creating session: {
  code: '42501',
  message: 'new row violates row-level security policy for table "conversation_sessions"'
}
```

The fix includes:
- Updated RLS policies for `conversation_sessions` table
- Improved session creation logic with better error handling
- Enhanced logging for debugging new user flows

### Applied Files:
- `src/lib/migrations/fix_conversation_sessions_rls.sql` - RLS policy updates
- `src/routes/projects/+page.svelte` - Enhanced error handling for session creation
- `scripts/test-new-user-flow.js` - Test script to verify the fix
