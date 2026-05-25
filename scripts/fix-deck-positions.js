import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixDeckPositions() {
  try {
    console.log('🔧 Fixing deck positions...');
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name');
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }
    
    console.log(`Found ${projects.length} projects`);
    
    for (const project of projects) {
      console.log(`\n📁 Processing project: ${project.name} (${project.id})`);
      
      // Get decks for this project ordered by created_at
      const { data: decks, error: decksError } = await supabase
        .from('decks')
        .select('id, name, position, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
      
      if (decksError) {
        console.error(`Error fetching decks for project ${project.id}:`, decksError);
        continue;
      }
      
      console.log(`  Found ${decks.length} decks`);
      
      // Update positions based on created_at order
      for (let i = 0; i < decks.length; i++) {
        const deck = decks[i];
        const newPosition = i;
        
        if (deck.position !== newPosition) {
          console.log(`  📝 Updating ${deck.name}: position ${deck.position} → ${newPosition}`);
          
          const { error: updateError } = await supabase
            .from('decks')
            .update({ position: newPosition })
            .eq('id', deck.id);
          
          if (updateError) {
            console.error(`    ❌ Error updating deck ${deck.id}:`, updateError);
          } else {
            console.log(`    ✅ Updated successfully`);
          }
        } else {
          console.log(`  ✓ ${deck.name} already has correct position ${newPosition}`);
        }
      }
    }
    
    console.log('\n🎉 Deck positions fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing deck positions:', error);
  }
}

fixDeckPositions();
