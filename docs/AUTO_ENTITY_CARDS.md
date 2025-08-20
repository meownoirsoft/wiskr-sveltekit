# Auto Entity Cards System

## Overview

The Auto Entity Cards system automatically groups related facts into coherent entity summaries for characters, places, events, organizations, and concepts. This transforms your app from simple fact storage into intelligent knowledge organization.

## 🎯 **What Entity Cards Provide**

### **Before Entity Cards:**
- Facts scattered: "Sarah Connor is 35", "Sarah Connor works at Tech Corp", "Sarah Connor has brown hair"
- No quick overview of entities
- AI gets 15 separate facts instead of coherent context

### **After Entity Cards:**
- **Coherent Summary**: "Sarah Connor is a 35-year-old character who works at Tech Corp. She has brown hair and..."
- **Visual Organization**: Cards group related information visually
- **Better AI Context**: AI gets entity summaries + relevant atomic facts

## 🏗️ **System Architecture**

```
Facts → Entity Detection AI → Entity Cards → Summary Generation AI → Context Integration
   ↓              ↓                ↓                ↓                    ↓
Atomic facts   Groups facts    Creates cards   Generates summaries   Better AI context
```

## 📊 **Database Schema**

### **entity_cards** table
```sql
- id (UUID)
- project_id (references projects)
- entity_name (VARCHAR 200) - "Sarah Connor", "Middle Earth"
- entity_type (VARCHAR 50) - character, place, event, organization, concept, object, other
- summary (TEXT) - AI-generated summary
- confidence_score (FLOAT) - AI confidence in entity detection (0-1)
- fact_count (INTEGER) - number of related facts
- embedding (VECTOR 1536) - for similarity search
- created_at, updated_at, last_facts_check
```

### **entity_card_facts** junction table
```sql
- entity_card_id (references entity_cards)
- fact_id (references facts)
- relevance_score (FLOAT) - how relevant this fact is to the entity
```

### **entity_relationships** table (future)
```sql
- from_entity_id, to_entity_id
- relationship_type - "knows", "located_in", "part_of", etc.
- relationship_description
```

## 🤖 **AI Services**

### **1. Entity Detection (`entityDetection.js`)**
```javascript
// Analyzes facts to detect entities
detectEntities(facts) → [
  {
    entity_name: "Sarah Connor",
    entity_type: "character",
    confidence: 0.95,
    fact_indices: [0, 3, 7],
    reasoning: "Main character mentioned in multiple facts"
  }
]

// Matches new facts to existing entities
matchFactToEntities(newFact, existingEntities) → relevance_scores
```

### **2. Entity Card Refresh (`entityCardRefresh.js`)**
```javascript
// Handles fact lifecycle events
handleNewFact(supabase, newFact)      // Links to existing entities, creates new ones
handleUpdatedFact(supabase, fact)     // Updates related entity summaries  
handleDeletedFact(supabase, factId)   // Removes relationships, deletes empty entities
```

## 🚀 **API Endpoints**

### **Generate Entity Cards**
```bash
POST /api/entity-cards/generate
{
  "projectId": "uuid",
  "mode": "full" | "force"
}
```

**Response:**
```json
{
  "message": "Generated 5 entity cards",
  "cardsGenerated": 5,
  "entitiesDetected": 7,
  "projectName": "My Story"
}
```

### **Get Entity Cards**
```bash
GET /api/entity-cards/generate?projectId=uuid
```

## 🎨 **UI Components**

### **EntityCards.svelte**
- **Grid Layout**: Responsive card grid with entity type icons
- **Generate Button**: Manual card generation with progress feedback
- **Auto-refresh**: Cards update when facts change
- **Entity Types**: Color-coded badges (character=blue, place=green, event=purple, etc.)

### **Card Information Display**
- Entity name and type
- AI-generated summary (2-3 sentences)
- Fact count and confidence score
- Last updated timestamp

## ⚙️ **Auto-Refresh System**

### **Triggers**
1. **New Fact Added**: 
   - Checks if it relates to existing entities (AI analysis)
   - 20% chance to scan for completely new entities
   - Updates entity fact counts and relationships

2. **Fact Updated**:
   - Finds related entity cards
   - Triggers summary regeneration (async)
   - Updates last_facts_check timestamps

3. **Fact Deleted**:
   - Removes entity-fact relationships
   - Updates fact counts
   - Deletes entity cards with zero facts

### **Smart Batching**
- Not every fact creates entities (performance optimization)
- Periodic scans of recent facts (20% chance per new fact)
- Confidence thresholds (0.7+) for new entity creation

## 🧠 **AI Context Integration**

Entity cards are integrated into `buildContext.js` with **high priority**:

```
Priority Order:
1. Project Description (ultimate priority)
2. Pinned Facts & Docs (MANDATORY - critical details) 🚨
3. Entity Cards (coherent summaries) 🆕
4. Project Brief 
5. Vector-matched Facts (MMR selected)
6. Vector-matched Docs (MMR selected)
```

### **Context Format**
```
🎭 ENTITY SUMMARIES - KEY KNOWLEDGE:

⚡ Sarah Connor (character) (high confidence):
Sarah Connor is a 35-year-old character who works at Tech Corp...

⚡ Tech Corp (organization):
Tech Corp is a technology company where several characters work...

💡 These entity cards provide coherent summaries. Use them as primary context, supplemented by specific facts below.
```

## 📈 **Benefits**

### **For Users**
- **Visual Organization**: See characters, places, events at a glance
- **Quick Overview**: Understand entities without reading scattered facts
- **Auto-maintenance**: Cards update as facts change

### **For AI Context**
- **Coherent Knowledge**: AI gets entity summaries instead of scattered facts
- **Better Responses**: More contextually aware answers
- **Efficient Tokens**: Summaries are more concise than individual facts

### **For Performance**
- **MMR Integration**: Diverse entity selection (no 8 similar character cards)
- **Smart Caching**: Summaries regenerated only when facts change
- **Confidence Scoring**: Only high-confidence entities become cards

## 🔧 **Configuration**

### **Entity Detection Thresholds**
```javascript
const MIN_CONFIDENCE = 0.3;        // Minimum confidence to consider entity
const NEW_ENTITY_CONFIDENCE = 0.7; // Minimum confidence to create new entity
const HIGH_CONFIDENCE = 0.8;       // Mark as "high confidence" in context
```

### **Processing Rates**
```javascript
const NEW_ENTITY_CHECK_RATE = 0.2; // 20% chance per new fact
const MAX_ENTITY_CARDS = 15;       // Limit for context building
const SELECTED_CARDS_LIMIT = 8;    // Final cards selected via MMR
```

## 🚀 **Usage Example**

```javascript
// In your projects page component
import EntityCards from '$lib/components/EntityCards.svelte';

// Pass current project and facts
<EntityCards 
  projectId={current.id} 
  facts={facts}
  on:cards-generated={(e) => {
    console.log(`Generated ${e.detail.cardsGenerated} entity cards!`);
  }}
/>
```

## 📝 **Database Setup**

1. **Apply Migration**: Run `entity_cards.sql` in your Supabase dashboard
2. **Update Vector Functions**: Apply the updated `supabase_vector_functions.sql`
3. **Test Generation**: Use the "Generate Cards" button with existing facts

## 🎯 **Best Practices**

### **For Better Entity Detection**
- Use descriptive fact keys: "Character: Sarah Connor's age" vs "Age: 35"
- Group related facts in time (add facts about same entity together)
- Use consistent naming across facts

### **For Performance**
- Entity cards auto-refresh in background (non-blocking)
- Cards only regenerate when underlying facts change
- Confidence thresholds prevent low-quality entities

## 🔮 **Future Enhancements**

1. **Entity Relationships**: "Sarah works at Tech Corp" → relationship mapping
2. **Visual Graph**: Network visualization of entity connections  
3. **Entity Merging**: Detect duplicate entities ("Sarah" vs "Sarah Connor")
4. **Custom Entity Types**: User-defined types beyond the built-in 7 types
5. **Entity Templates**: Pre-defined entity structures for common use cases

---

Entity cards transform your facts into organized knowledge, making your AI assistant much smarter and your information much more navigable! 🚀
