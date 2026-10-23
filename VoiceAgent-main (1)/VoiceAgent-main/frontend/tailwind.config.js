/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Precision Minimalist SaaS color tokens (MD3 naming schema)
        primary: {
          DEFAULT: '#0050cb',
          container: '#0066ff',
          fixed: '#dae1ff',
          'fixed-dim': '#b3c5ff',
        },
        secondary: {
          DEFAULT: '#006c49',
          container: '#6cf8bb',
          fixed: '#6ffbbe',
          'fixed-dim': '#4edea3',
        },
        tertiary: {
          DEFAULT: '#7f4f00',
          container: '#a06500',
          fixed: '#ffddb8',
          'fixed-dim': '#ffb95f',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        background: '#faf8ff',
        surface: {
          DEFAULT: '#faf8ff',
          dim: '#d2d9f4',
          bright: '#faf8ff',
          'container-lowest': '#ffffff',
          'container-low': '#f2f3ff',
          container: '#eaedff',
          'container-high': '#e2e7ff',
          'container-highest': '#dae2fd',
          variant: '#dae2fd',
          tint: '#0054d6',
        },
        // On elements
        'on-primary': '#ffffff',
        'on-primary-container': '#f8f7ff',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#00714d',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fff7f1',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'on-background': '#131b2e',
        'on-surface': '#131b2e',
        'on-surface-variant': '#424656',
        'on-primary-fixed': '#001849',
        'on-primary-fixed-variant': '#003fa4',
        'on-secondary-fixed': '#002113',
        'on-secondary-fixed-variant': '#005236',
        'on-tertiary-fixed': '#2a1700',
        'on-tertiary-fixed-variant': '#653e00',
        'inverse-surface': '#283044',
        'inverse-on-surface': '#eef0ff',
        'inverse-primary': '#b3c5ff',
        
        // Borders and outlines
        outline: '#727687',
        'outline-variant': '#c2c6d8',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        DEFAULT: '0.25rem', // sm: 4px
        lg: '0.5rem',       // md: 8px
        xl: '0.75rem',      // lg: 12px
        '2xl': '1rem',      // xl: 16px
        full: '9999px',
      },
      spacing: {
        base: '8px',
        gutter: '24px',
        'sidebar-width': '240px',
        'container-max-width': '1440px',
        'margin-mobile': '16px',
        'margin-desktop': '32px',
      },
      boxShadow: {
        sm: '0px 1px 3px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
