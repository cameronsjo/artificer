/**
 * Tailwind v3 starter config mapping Artificer CSS custom properties.
 *
 * Tailwind v4 users: skip this file and import the canonical @theme stylesheet:
 *   @import "tailwindcss";
 *   @import "@cameronsjo/artificer/artificer.css";
 *   @import "@cameronsjo/artificer/tailwind.css";
 *
 * Tailwind v3 usage:
 *   1. Copy this file to your project root as `tailwind.config.cjs` (or merge into existing).
 *   2. Import `@cameronsjo/artificer/artificer.css` in your app entry — it provides the CSS custom properties.
 *   3. Use Tailwind utilities for ad-hoc spacing/layout; use Artificer classes (.btn, .card, .field, .notif, .modal) for components.
 */

// Every color maps to a CSS custom property so dark/light themes flip automatically.
const colorVar = (name) => `var(--${name})`;

module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx,vue,svelte,astro}'],
  theme: {
    extend: {
      colors: {
        bg:                    colorVar('bg'),
        'bg-raised':           colorVar('bg-raised'),
        'bg-overlay':          colorVar('bg-overlay'),
        'bg-inactive':         colorVar('bg-inactive'),
        fg:                    colorVar('fg'),
        'fg-secondary':        colorVar('fg-secondary'),
        'fg-muted':            colorVar('fg-muted'),
        'fg-disabled':         colorVar('fg-disabled'),
        border:                colorVar('border'),
        'border-lifted':       colorVar('border-lifted'),
        accent:                colorVar('accent'),
        'accent-bright':       colorVar('accent-bright'),
        'accent-fill':         colorVar('accent-fill'),
        'on-accent':           colorVar('on-accent'),
        attention:             colorVar('attention'),
        'attention-fill':      colorVar('attention-fill'),
        'on-attention':        colorVar('on-attention'),
        urgent:                colorVar('urgent'),
        'urgent-fill':         colorVar('urgent-fill'),
        'urgent-text':         colorVar('urgent-text'),
        'on-urgent':           colorVar('on-urgent'),
        success:               colorVar('success'),
        'success-fill':        colorVar('success-fill'),
        'on-success':          colorVar('on-success'),
        steel:                 colorVar('steel'),
        'steel-fill':          colorVar('steel-fill'),
        'diff-add-bg':         colorVar('diff-add-bg'),
        'diff-del-bg':         colorVar('diff-del-bg'),
        'brand-purple':        colorVar('brand-purple'),
        'brand-purple-bright': colorVar('brand-purple-bright'),
        'brand-purple-fill':   colorVar('brand-purple-fill'),
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Berkeley Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        body: ['Bricolage Grotesque', 'Source Sans 3', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        interface: ['Recursive', 'Source Sans 3', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Legacy alias of `body` — kept resolvable for consumers pinned to the old key.
        sans: ['Bricolage Grotesque', 'Source Sans 3', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        xs:    '4px',
        sm:    '8px',
        md:    '16px',
        lg:    '24px',
        xl:    '32px',
        '2xl': '48px',
        '3xl': '96px',
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        pill: '999px',
      },
      screens: {
        mobile: '640px',
        tablet: '800px',
        wide:   '1200px',
      },
      transitionDuration: {
        instant: '80ms',
        fast:    '160ms',
        max:     '300ms',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      },
      zIndex: {
        base:    '1',
        raised:  '10',
        overlay: '100',
        popover: '1000',
        modal:   '2000',
        toast:   '3000',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
        popover: 'var(--shadow-popover)',
      },
    },
  },
  darkMode: ['selector', '[data-theme="dark"]'],
  plugins: [],
};
