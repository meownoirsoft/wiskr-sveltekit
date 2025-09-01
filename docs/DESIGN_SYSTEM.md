# Wiskr Design System

This guide ensures consistent design patterns across the Wiskr application.

## Core Principles

1. **Consistency**: Use standardized components and tokens
2. **Accessibility**: Follow WCAG guidelines
3. **Mobile-first**: Design for mobile, enhance for desktop
4. **Performance**: Minimize CSS and optimize for speed

## Design Tokens

### Colors

All colors should use CSS custom properties from `src/app.css`:

```css
/* Primary colors */
--color-accent: #155DFC;
--color-accent-hover: #0f4edd;

/* Backgrounds */
--bg-primary: #ffffff; (light) / #1a1a1a (dark)
--bg-card: #ffffff; (light) / #35353d (dark)
--bg-input: #F8FAFC; (light) / #222226 (dark)

/* Text */
--text-primary: #1f2937; (light) / #ffffff (dark)
--text-header-secondary: #6b7280; (light) / #9ca3af (dark)
```

### Typography

```css
/* Font families */
font-family: 'Inter' (UI text)
font-family: 'JetBrains Mono' (code/monospace)

/* Font sizes */
text-xs: 0.75rem;   /* 12px */
text-sm: 0.875rem;  /* 14px */
text-base: 1rem;    /* 16px */
text-lg: 1.125rem;  /* 18px */
```

### Spacing

Use consistent spacing scale based on `rem` units:

```css
gap-1: 0.25rem;  /* 4px */
gap-2: 0.5rem;   /* 8px */
gap-3: 0.75rem;  /* 12px */
gap-4: 1rem;     /* 16px */
gap-6: 1.5rem;   /* 24px */
```

## Component Standards

### Buttons

Use the standardized `Button` component:

```svelte
import Button from '$lib/components/ui/Button.svelte';

<!-- Primary button -->
<Button variant="primary" size="md">Save Changes</Button>

<!-- Secondary button -->
<Button variant="secondary" size="sm">Cancel</Button>

<!-- Loading button -->
<Button variant="primary" loading={isLoading}>Submit</Button>
```

#### Button Sizes
- `sm`: 32px height (`h-8`) - For compact UI elements
- `md`: 40px height (`h-10`) - Default size
- `lg`: 48px height (`h-12`) - For prominent actions

### Form Elements

Use the standardized `Input` component:

```svelte
import Input from '$lib/components/ui/Input.svelte';

<Input 
  label="Project Name" 
  placeholder="Enter name..." 
  required 
  bind:value={projectName}
  error={errors.projectName}
/>
```

#### Input Background Colors (Per Rules)
- Light mode: `#F8FAFC`
- Dark mode: `#1b1b1e` (per user preference)

### Modal Standards

All modals should use consistent patterns:

```svelte
<!-- Modal backdrop with blur -->
<div class="fixed inset-0 z-50 flex items-center justify-center">
  <div class="absolute inset-0 backdrop-blur-sm bg-black/30 dark:bg-black/40"></div>
  <div class="relative bg-[var(--bg-modal)] rounded-lg shadow-xl max-w-md w-full mx-4">
    <!-- Modal content -->
  </div>
</div>
```

### Card Backgrounds (Per Rules)

Fact cards, question cards, and related idea cards should use:
- Light mode: `#ffffff`
- Dark mode: `#35353d`

## CSS Custom Properties Usage

### DO ✅
```css
/* Use CSS variables for theming */
background-color: var(--bg-primary);
color: var(--text-primary);
border-color: var(--border-header-input);

/* Use Tailwind utility with CSS variables */
class="bg-[var(--bg-primary)] text-[var(--text-primary)]"
```

### DON'T ❌
```css
/* Don't hardcode colors */
background-color: #ffffff;
color: #1f2937;

/* Don't mix approaches inconsistently */
background: white; /* when you should use var(--bg-primary) */
```

## Component Naming

### File Naming
- UI components: `PascalCase.svelte` (e.g., `Button.svelte`)
- Feature components: `PascalCase.svelte` (e.g., `ChatInterface.svelte`)
- Utility components: `PascalCase.svelte` (e.g., `LoadingSpinner.svelte`)

### Event Naming
Use Svelte-style event bindings:
```svelte
<!-- DO ✅ -->
on:mouseleave={() => handleLeave()}

<!-- DON'T ❌ -->
onmouseleave={() => handleLeave()} 
```

## Responsive Design

### Breakpoints
```css
/* Mobile first approach */
@media (max-width: 640px) { /* Mobile */ }
@media (max-width: 1279px) { /* Tablet/Mobile */ }
@media (min-width: 1280px) { /* Desktop */ }
```

### Touch Targets
Minimum 44px touch targets on mobile:
```css
button {
  min-height: 44px;
  min-width: 44px;
}
```

## Dark Mode

All components must support dark mode using CSS custom properties:

```svelte
<div style="background-color: var(--bg-primary); color: var(--text-primary);">
  Content adapts to theme automatically
</div>
```

## Accessibility

1. **Color contrast**: Ensure 4.5:1 ratio minimum
2. **Focus states**: All interactive elements need visible focus
3. **Labels**: Form elements must have proper labels
4. **ARIA attributes**: Use when necessary for screen readers

## Migration Strategy

To standardize existing components:

1. **Replace hardcoded values** with CSS variables
2. **Use standardized components** (Button, Input, etc.)
3. **Ensure consistent spacing** using design tokens
4. **Test in both light and dark modes**

## Examples

### Before (Non-standardized)
```svelte
<button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
  Save
</button>
```

### After (Standardized)
```svelte
import Button from '$lib/components/ui/Button.svelte';

<Button variant="primary" size="md">Save</Button>
```

This approach ensures:
- ✅ Consistent theming
- ✅ Proper dark mode support  
- ✅ Standardized sizing
- ✅ Accessible focus states
- ✅ Mobile-friendly touch targets
