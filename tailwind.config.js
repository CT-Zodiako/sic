/** @type {import('tailwindcss').Config} */
// Tokens tomados de docs/guias diseno/disenogeneral (estilo MD3: primary sky, surfaces slate, tertiary green)
module.exports = {
  darkMode: 'class',
  content: ['./frontend/src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // ── Escala principal (de la referencia)
        'primary': '#0284c7',
        'primary-container': '#0284c7',
        'on-primary': '#ffffff',
        'on-primary-container': '#ffffff',
        'primary-fixed': '#e0f2fe',
        'primary-fixed-dim': '#bae6fd',
        'on-primary-fixed': '#082f49',
        'inverse-primary': '#0369a1',
        'surface-tint': '#0284c7',

        // ── Superficies (slate de la referencia)
        'surface': '#ffffff',
        'surface-bright': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f8fafc',
        'surface-container': '#f1f5f9',
        'surface-container-high': '#e2e8f0',
        'surface-container-highest': '#e2e8f0',
        'surface-dim': '#e2e8f0',
        'surface-variant': '#e2e8f0',
        'background': '#f8fafc',

        // ── Texto
        'on-surface': '#0f172a',
        'on-surface-variant': '#475569',
        'on-background': '#0f172a',
        'inverse-surface': '#1e293b',
        'inverse-on-surface': '#f8fafc',

        // ── Tertiary (verde de la referencia)
        'tertiary': '#059669',
        'tertiary-container': '#d1fae5',
        'tertiary-fixed': '#d1fae5',
        'tertiary-fixed-dim': '#34d399',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#064e3b',
        'on-tertiary-fixed': '#022c22',
        'on-tertiary-fixed-variant': '#047857',

        // ── Error / secondary
        'error': '#dc2626',
        'error-container': '#fee2e2',
        'on-error': '#ffffff',
        'on-error-container': '#991b1b',
        'secondary': '#dc2626',
        'secondary-container': '#dc2626',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#ffffff',
        'secondary-fixed': '#ffdad6',
        'secondary-fixed-dim': '#fca5a5',
        'on-secondary-fixed': '#410002',
        'on-secondary-fixed-variant': '#991b1b',

        // ── Outline
        'outline': '#64748b',
        'outline-variant': '#cbd5e1',
      },
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'Roboto', 'Arial', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
        mono: ['Montserrat', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, .08), 0 1px 2px rgba(15, 23, 42, .04)',
        'card-lg': '0 10px 24px rgba(15, 23, 42, .10)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
