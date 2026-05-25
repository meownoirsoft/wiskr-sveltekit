import { createClient } from '@supabase/supabase-js';

// You'll need to set these environment variables
const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Create admin client
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testProfileAccess() {
  const userId = '4b73d335-7866-4c89-b084-5e8e60054aa0';
  
  console.log('🔍 Testing profile access for user:', userId);
  
  try {
    // Test admin client access
    console.log('\n📊 Admin client query:');
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (adminError) {
      console.error('❌ Admin client error:', adminError);
    } else {
      console.log('✅ Admin client success:', adminProfile);
    }
    
    // Test if we can create a profile (should fail with duplicate key)
    console.log('\n🔄 Testing profile creation (should fail with duplicate key):');
    const { data: createData, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        tier: 0,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_subscription_status: null
      })
      .select()
      .single();
      
    if (createError) {
      if (createError.code === '23505') {
        console.log('✅ Duplicate key error (expected):', createError.message);
      } else {
        console.error('❌ Unexpected create error:', createError);
      }
    } else {
      console.log('⚠️  Profile created (unexpected):', createData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProfileAccess();
