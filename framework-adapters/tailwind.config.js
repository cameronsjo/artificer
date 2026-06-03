/**
 * Tailwind v3+ config that pulls Artificer tokens from tokens.json.
 *
 * Usage:
 *   1. Copy this file to your project root as `tailwind.config.js` (or merge into existing).
 *   2. Import artificer.css in your app entry — it provides the CSS custom properties this config references.
 *   3. Use Tailwind utilities as normal: `bg-bg`, `text-fg`, `text-accent`, `font-mono`, etc.
 *
 * Why both? Tailwind utilities for ad-hoc spacing/layout, Artificer classes for canonical
 * components (.btn, .card, .field, .notif, .modal). Don't recreate Artificer's components in Tailwind.
 */
const tokens = require('./src/tokens.json');

// Helper — every color in the system maps to a CSS var so it stays themeable.
const colorVar = (name) => `var(--${name})`;

module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx,vue,svelte}'],
  theme: {
    extend: {
      colors: {
        bg:           colorVar('bg'),
        'bg-raised':  colorVar('bg-raised'),
        'bg-overlay': colorVar('bg-overlay'),
        'bg-inactive':colorVar('bg-inactive'),
        fg:           colorVar('fg'),
        'fg-secondary': colorVar('fg-secondary'),
        'fg-disabled': colorVar('fg-disabled'),
        accent:       colorVar('accent'),
        'accent-bright': colorVar('accent-bright'),
        'accent-fill': colorVar('accent-fill'),
        'on-accent':  colorVar('on-accent'),
        brand:        colorVar('brand'),
        'brand-bright': colorVar('brand-bright'),
        success:      colorVar('success'),
        attention:    colorVar('attention'),
        urgent:       colorVar('urgent'),
        border:       colorVar('border'),
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Spacing follows the 8px grid baked into Artificer.
      spacing: {
        xs:  '4px',
        sm:  '8px',
        md:  '16px',
        lg:  '24px',
        xl:  '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      transitionDuration: {
        instant: '80ms',
        fast: '160ms',
        max: '300ms',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      },
      zIndex: {
        base: '1',
        raised: '10',
        overlay: '100',
        popover: '1000',
        modal: '2000',
        toast: '3000',
      },
      boxShadow: {
        overlay: '0 4px 12px rgba(0, 0, 0, 0.35)',
        popover: '0 2px 8px rgba(0, 0, 0, 0.30)',
      },
    },
  },
  // Honor `data-theme="dark"` and `data-theme="light"` switching.
  // Artificer applies the attribute to <html>; Tailwind's dark: variant respects it.
  darkMode: ['selector', '[data-theme="dark"]'],
  plugins: [],
};
