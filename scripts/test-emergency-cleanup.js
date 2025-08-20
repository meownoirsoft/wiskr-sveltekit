#!/usr/bin/env node

/**
 * Test script to verify the emergency cleanup and new user flow
 * 
 * This script simulates a new user visiting /projects and checks:
 * 1. No BEDNOMANCER projects remain
 * 2. RLS policies work correctly
 * 3. New project and session creation works
 * 4. No RLS errors occur
 * 
 * Run after executing the emergency_cleanup.sql migration
 */

console.log('🧪 Testing Emergency Cleanup Results');
console.log('=====================================');

console.log('\n📋 Steps to manually verify the fix:');
console.log('1. Run the emergency_cleanup.sql script in Supabase SQL editor');
console.log('2. Clear your browser localStorage (F12 > Application > Storage > Clear)');
console.log('3. Refresh the /projects page');
console.log('4. Verify these expected behaviors:\n');

console.log('✅ Expected Results:');
console.log('   • No BEDNOMANCER project should appear');
console.log('   • If no projects exist, "My First Project" should be auto-created');
console.log('   • Console should show: "✅ Created first project for new user: My First Project"');
console.log('   • Console should show: "✅ Created default session for new project: Main Chat"');
console.log('   • No RLS policy errors (42501) should appear in console');
console.log('   • You should be able to type in the chat box without errors');
console.log('   • Project editing should work without "Cannot coerce to single JSON object" error');

console.log('\n🚨 Red Flags (should NOT happen):');
console.log('   • Any mention of BEDNOMANCER in the UI');
console.log('   • Error: "new row violates row-level security policy"');
console.log('   • Error: "Cannot coerce the result to a single JSON object"');
console.log('   • Projects list showing empty but localStorage still has wiskr_last_project_id');

console.log('\n🔧 If issues persist:');
console.log('   • Check browser console for specific error messages');
console.log('   • Clear localStorage again: localStorage.clear()');
console.log('   • Verify the emergency_cleanup.sql ran successfully in Supabase');
console.log('   • Check Supabase logs for any remaining RLS policy violations');

console.log('\n🔍 Debugging Commands (run in browser console):');
console.log('   // Check localStorage for stale data');
console.log('   console.log(localStorage.getItem("wiskr_last_project_id"));');
console.log('   ');
console.log('   // Clear all Wiskr localStorage data');
console.log('   Object.keys(localStorage).forEach(key => {');
console.log('     if (key.startsWith("wiskr")) localStorage.removeItem(key);');
console.log('   });');
console.log('   ');
console.log('   // Force page reload');
console.log('   window.location.reload();');

console.log('\n📊 Database Verification (run in Supabase SQL editor):');
console.log('   SELECT name, user_id FROM projects WHERE user_id = auth.uid();');
console.log('   SELECT COUNT(*) FROM conversation_sessions;');
console.log('   SELECT tablename, policyname FROM pg_policies WHERE tablename IN (\'projects\', \'conversation_sessions\');');

console.log('\n🎯 Success Criteria:');
console.log('   • Clean project list with no ghost/orphaned projects');
console.log('   • Smooth new user onboarding with auto-created project and session');
console.log('   • No RLS errors during normal app usage');
console.log('   • localStorage cleanup utility prevents future issues');

console.log('\nTest complete! Please follow the manual verification steps above.');
