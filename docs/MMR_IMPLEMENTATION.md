# MMR (Maximal Marginal Relevance) Implementation

## Overview

We've implemented MMR to ensure diverse search results instead of getting 10 near-duplicates. MMR balances **relevance** to the user's query with **diversity** from already-selected results.

## How It Works

### 1. **Vector Search with 3x Candidates**
- Database functions now return **3x the desired limit** (e.g., 36 fact candidates for 12 final results)
- This gives MMR plenty of options to choose diverse results from

### 2. **MMR Algorithm** 
The MMR formula: **λ × relevance - (1-λ) × max_similarity_to_selected**

- **λ (lambda)**: Controls the relevance vs diversity tradeoff
  - `λ = 1.0`: Pure relevance (like before)  
  - `λ = 0.7`: 70% relevance, 30% diversity (our default)
  - `λ = 0.0`: Pure diversity (may sacrifice relevance)

### 3. **Selection Process**
1. **First item**: Select the most relevant result
2. **Remaining items**: For each remaining spot, calculate MMR score for all candidates:
   - Higher **relevance** to query = higher score
   - Higher **similarity to already-selected** = lower score
3. **Final result**: Diverse set that balances relevance with variety

## Configuration

### Environment Variables

```bash
# Relevance vs diversity balance (0.0-1.0)
MMR_LAMBDA=0.7

# Enable/disable MMR entirely
MMR_ENABLED=true
```

### Default Settings
- **MMR_LAMBDA**: `0.7` (70% relevance, 30% diversity)
- **MMR_ENABLED**: `true` 
- **Candidate multiplier**: 3x (returns 36 candidates to select 12 diverse results)

## Benefits

### Before MMR
If you had 10 very similar facts about "character appearance", you'd get all 10 redundant results.

### After MMR
You get diverse results like:
1. Character appearance (most relevant)
2. Character personality (diverse from #1)
3. Character backstory (diverse from #1-2)
4. Character relationships (diverse from #1-3)
5. etc.

## Logging

Watch for these log messages to see MMR in action:

```
🔬 Vector-matched facts candidates: 36 found
🎯 MMR: Selecting 12 diverse results from 36 candidates (λ=0.7)
🎯 MMR: Selected first item (relevance=0.856): Character Name
🎯 MMR: Selected item 2 (MMR=0.623): Character Backstory
🎯 MMR: Selected item 3 (MMR=0.591): Setting Description
🎯 MMR: Final selection complete - 12 diverse results
🎯 MMR selected facts: 12 diverse facts
   - Mode used: 🎯 VECTOR SEARCH + MMR DIVERSITY
```

## Files Modified

1. **`/src/lib/server/utils/mmr.js`** - Core MMR algorithm
2. **`/src/lib/server/context/buildContext.js`** - Integration into context building
3. **`/src/lib/migrations/supabase_vector_functions.sql`** - Database functions return embeddings and 3x candidates

## Performance Impact

- **Minimal**: MMR runs client-side after getting database results
- **Database**: Slightly more data transferred (embeddings + 3x results), but still very fast
- **Memory**: Temporary - candidates are processed then discarded

## Tuning

- **More diversity**: Lower lambda (`MMR_LAMBDA=0.5`)
- **More relevance**: Higher lambda (`MMR_LAMBDA=0.9`)
- **Disable**: Set `MMR_ENABLED=false` to fall back to pure relevance ranking
