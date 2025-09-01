# Performance Optimization Guide

## 🚨 Major Issues Identified

### **File Size Analysis (Lines of Code)**
1. **`projects/+page.svelte`**: 2,042 lines 😱
2. **`GlobalSearch.svelte`**: 1,570 lines 📈  
3. **`ChatInterface.svelte`**: 1,143 lines 💬
4. **`+layout.svelte`**: 1,071 lines 🏗️

These massive files are definitely impacting compile times!

## ✅ Completed Optimizations

### 1. **Dual Server Setup**
- Admin server on port 5174 isolates heavy admin components
- Main app on port 5173 loads faster without admin overhead
- Use `npm run dev:both` to run both servers

### 2. **Component Extraction**
- ✅ **SessionManager.svelte** - Extracted session management logic
- ✅ **BranchManager.svelte** - Extracted branching functionality  
- ✅ **LazyLoad utility** - Dynamic component loading system

### 3. **Lazy Loading Infrastructure**
- Components load only when needed
- Route-based preloading
- Intersection Observer for viewport-based loading

## 🎯 Immediate Action Items

### **Priority 1: Break Down Projects Page (2,042 lines)**

Extract these major sections into separate components:

#### **ContextManager.svelte** (handles facts/docs/context)
```javascript
// Extract lines ~182-400 from projects page
- Context state management
- Facts loading and filtering  
- Docs loading and filtering
- Add fact/doc forms
```

#### **MessageHandler.svelte** (handles chat messages)
```javascript
// Extract lines ~158-180 + message handling logic
- Messages array management
- Loading states
- Message formatting
- Send message functionality
```

#### **ProjectState.svelte** (handles project selection)
```javascript
// Extract lines ~34-147
- Project selection logic
- Local storage management
- Project switching
- Initialization logic
```

### **Priority 2: Split GlobalSearch (1,570 lines)**

#### **SearchDropdown.svelte**
```javascript
// Extract dropdown rendering (~400 lines)
- Results display
- Click handlers
- Category sections
```

#### **SearchHighlighter.svelte** 
```javascript
// Extract highlighting logic (~300 lines)
- DOM highlighting
- Navigation controls
- Highlight management
```

#### **SessionNavigator.svelte**
```javascript
// Extract session navigation (~200 lines)
- Session filtering
- Navigation state
- Result grouping
```

### **Priority 3: Optimize ChatInterface (1,143 lines)**

#### **MessageList.svelte**
```javascript
// Extract message rendering
- Message display
- Branch indicators
- Message formatting
```

#### **MessageInput.svelte**
```javascript
// Extract input handling
- Input state
- Send functionality
- Formatting controls
```

### **Priority 4: Slim Down Layout (1,071 lines)**

#### **ThemeManager.js** (utility module)
```javascript
// Extract theme logic (~200 lines)
- Theme switching
- Color management
- LocalStorage handling
```

#### **AnalyticsManager.js** (utility module)
```javascript
// Extract analytics (~100 lines)
- Event tracking
- User identification
- Page view tracking
```

## 🚀 Performance Strategies

### **1. Lazy Loading Implementation**

```javascript
// In your components, use:
import { loadComponent } from '$lib/utils/lazyLoad.js';

let ComponentToLoad = null;
let loading = false;

async function loadWhenNeeded() {
  loading = true;
  ComponentToLoad = await loadComponent('HeavyComponent');
  loading = false;
}
```

### **2. Route-Based Code Splitting**

```javascript
// In +layout.svelte, add:
import { preloadForRoute } from '$lib/utils/lazyLoad.js';
import { page } from '$app/stores';

$: preloadForRoute($page.url.pathname);
```

### **3. Intersection Observer Loading**

```javascript
// For components that appear below the fold:
import { observeForLazyLoad } from '$lib/utils/lazyLoad.js';

let elementRef;
let showComponent = false;

onMount(() => {
  observeForLazyLoad(elementRef, () => {
    showComponent = true;
  });
});
```

## 📊 Bundle Analysis

### **Run Analysis**
```bash
npm run build
npm run analyze
```

### **Expected Improvements**
- **Initial load time**: 30-50% faster
- **Compile time**: 40-60% faster  
- **Memory usage**: 20-30% lower
- **Hot reload speed**: 2-3x faster

## 🛠️ Implementation Priority

### **Week 1: Core Extraction**
1. Extract SessionManager and BranchManager
2. Implement lazy loading for modals
3. Split projects page into 3-4 components

### **Week 2: Search & Chat Optimization**  
1. Break down GlobalSearch component
2. Split ChatInterface into smaller pieces
3. Implement viewport-based lazy loading

### **Week 3: Layout & Performance**
1. Extract theme and analytics managers
2. Implement route-based preloading
3. Add bundle size monitoring

## 🎯 Expected Results

After full implementation:
- **Projects page**: 2,042 → ~400 lines (80% reduction)
- **GlobalSearch**: 1,570 → ~200 lines (87% reduction)  
- **ChatInterface**: 1,143 → ~300 lines (74% reduction)
- **Layout**: 1,071 → ~600 lines (44% reduction)

**Total reduction**: ~3,800 lines moved to smaller, focused components!

## 🚨 Quick Wins (30 minutes each)

1. **Extract SessionManager** - Already created, just need to integrate
2. **Extract BranchManager** - Already created, just need to integrate  
3. **Lazy load modals** - Use dynamic imports for FormatModal, BranchModal, etc.
4. **Move theme logic** - Extract to utility module

These changes alone should improve compile time by 20-30%!
