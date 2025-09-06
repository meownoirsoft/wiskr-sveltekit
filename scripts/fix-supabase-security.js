#!/usr/bin/env node

/**
 * Script to fix Supabase security issues
 * Run this script to apply the security fixes
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔒 Supabase Security Fix Script');
console.log('================================\n');

console.log('This script will help you fix the following security issues:');
console.log('1. Function search path mutable (8 functions)');
console.log('2. Extension in public schema (vector extension)');
console.log('3. Auth OTP long expiry (manual fix required)');
console.log('4. Leaked password protection disabled (manual fix required)\n');

console.log('📋 Steps to fix these issues:\n');

console.log('1. FUNCTION SEARCH PATHS:');
console.log('   - Run the migration: fix_function_search_paths.sql');
console.log('   - This adds SET search_path = \'\' to all functions\n');

console.log('2. VECTOR EXTENSION:');
console.log('   - Run the migration: fix_vector_extension_schema.sql');
console.log('   - This creates a dedicated schema for extensions\n');

console.log('3. AUTH SETTINGS (Manual fixes in Supabase Dashboard):');
console.log('   - Go to Authentication → Settings');
console.log('   - Set OTP expiry to less than 1 hour (recommended: 15-30 minutes)');
console.log('   - Enable "Leaked password protection"\n');

console.log('4. RUN MIGRATIONS:');
console.log('   - Use Supabase CLI: supabase db push');
console.log('   - Or run SQL directly in Supabase Dashboard → SQL Editor\n');

console.log('📁 Migration files created:');
console.log('   - migrations/fix_function_search_paths.sql');
console.log('   - migrations/fix_vector_extension_schema.sql\n');

console.log('⚠️  Note: Some fixes require manual intervention in the Supabase Dashboard');
console.log('   - Auth settings cannot be changed via SQL migrations');
console.log('   - Vector extension schema change may require superuser privileges\n');

console.log('✅ After applying these fixes, the security warnings should be resolved!');
