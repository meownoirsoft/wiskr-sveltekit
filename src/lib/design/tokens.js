// Design System Tokens for Wiskr
// Centralized design tokens that map to CSS variables

export const tokens = {
  // Spacing scale (consistent rem values)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    '4xl': '3rem',    // 48px
  },

  // Font sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },

  // Border radius scale
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  // Component-specific sizes
  components: {
    button: {
      height: {
        sm: '2rem',     // 32px - h-8
        md: '2.5rem',   // 40px - h-10  
        lg: '3rem',     // 48px - h-12
      },
      padding: {
        sm: '0.5rem 0.75rem',  // px-3 py-2
        md: '0.75rem 1rem',    // px-4 py-3
        lg: '1rem 1.5rem',     // px-6 py-4
      }
    },
    input: {
      height: {
        sm: '2rem',     // 32px
        md: '2.5rem',   // 40px
        lg: '3rem',     // 48px
      },
      padding: {
        horizontal: '0.75rem', // px-3
        vertical: '0.5rem',    // py-2
      }
    },
    modal: {
      maxWidth: {
        sm: '24rem',    // 384px
        md: '32rem',    // 512px
        lg: '48rem',    // 768px
        xl: '64rem',    // 1024px
      }
    }
  }
};

// CSS Variable mappings
export const cssVars = {
  // Colors
  colors: {
    primary: 'var(--color-accent)',
    primaryHover: 'var(--color-accent-hover)',
    background: 'var(--bg-primary)',
    surface: 'var(--bg-card)',
    text: 'var(--text-primary)',
    textSecondary: 'var(--text-header-secondary)',
    border: 'var(--border-header-input)',
  },
  
  // Backgrounds
  backgrounds: {
    input: 'var(--bg-input)',
    modal: 'var(--bg-modal)',
    panel: 'var(--bg-panel-left)',
    chat: 'var(--bg-chat)',
    askForm: 'var(--bg-ask-form)',
  }
};

// Utility functions for consistent styling
export const getButtonClasses = (size = 'md', variant = 'primary') => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizeClasses = {
    sm: 'h-8 px-3 py-2 text-sm',
    md: 'h-10 px-4 py-3 text-base', 
    lg: 'h-12 px-6 py-4 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white focus:ring-[var(--color-accent)]',
    secondary: 'bg-[var(--bg-button-secondary)] hover:bg-[var(--bg-button-secondary-hover)] text-[var(--text-primary)] border border-[var(--border-header-input)]',
    ghost: 'hover:bg-[var(--bg-button-secondary)] text-[var(--text-primary)]'
  };
  
  return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
};

export const getInputClasses = (size = 'md') => {
  const baseClasses = 'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]';
  
  const sizeClasses = {
    sm: 'h-8 px-3 py-2 text-sm',
    md: 'h-10 px-3 py-2 text-base',
    lg: 'h-12 px-4 py-3 text-lg'
  };
  
  const colorClasses = 'bg-[var(--bg-input)] border-[var(--border-header-input)] text-[var(--text-primary)]';
  
  return `${baseClasses} ${sizeClasses[size]} ${colorClasses}`;
};
