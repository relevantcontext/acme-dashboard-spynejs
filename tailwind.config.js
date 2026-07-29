import forms from '@tailwindcss/forms';

/**
 * Ported from the Next.js app's tailwind.config.ts, minus the TypeScript.
 *
 * The `theme` block is identical — same custom blue palette, same 13-column
 * grid, same shimmer keyframes, same forms plugin. Those values are what the
 * Acme UI is built out of, so they have to match exactly, or a visual
 * difference between the two apps could turn out to be a palette difference
 * rather than an architectural one.
 *
 * Two things necessarily differ:
 *
 *   - `content` points at this app's sources rather than a Next.js `app/` tree.
 *   - ESM syntax, because this package is `"type": "module"`. The Next.js config
 *     uses `require('@tailwindcss/forms')`; the same call here would throw
 *     `require is not defined`.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,html}',
    './src/index.tmpl.html',
    // The CMS drives markup from JSON, so class names can originate there too.
    // Without this, a utility used only in CMS content would be purged.
    './src/static/data/**/*.json',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        13: 'repeat(13, minmax(0, 1fr))',
      },
      colors: {
        blue: {
          400: '#2589FE',
          500: '#0070F3',
          600: '#2F6FEB',
        },
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [forms],
};
