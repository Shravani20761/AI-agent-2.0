---
name: Precision Minimalist SaaS
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#424656'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#7f4f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a06500'
  on-tertiary-container: '#fff7f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  sidebar-width: 240px
  container-max-width: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for high-performance data management and AI-driven automation. It prioritizes utility and focus, drawing inspiration from contemporary engineering-led platforms. The aesthetic is characterized by extreme clarity, purposeful density, and a "hardware-software" synthesis that feels both technical and approachable.

The style is **Corporate / Modern** with a lean toward **Minimalism**. It uses a "low-chrome" approach, where the UI recedes to let the data and AI insights lead. Visual interest is generated through precise typography and sophisticated accent colors rather than decorative ornamentation. The emotional response should be one of control, efficiency, and intelligence.

## Colors

The palette is engineered for professional environments where legibility is paramount. 
- **Primary (Electric Blue):** Reserved for core "intent" actions, primary buttons, and active states of AI-driven features.
- **Secondary (Emerald):** Denotes growth, successful admissions, and positive financial trajectories.
- **Tertiary (Amber):** Used specifically for overdue leads, warnings, or urgent attention requirements in the CRM pipeline.
- **Neutral (Deep Slate/Navy):** Applied to the sidebar and navigation architecture to provide a grounding anchor for the lighter content area.
- **Surfaces:** A crisp White surface sits atop a very light Gray-50 background, creating subtle tonal separation for card components without relying on heavy shadows.

## Typography

The design system utilizes **Geist** for its technical precision and exceptional legibility in data-dense environments. 

The typographic scale is designed for high information density. We utilize tight letter spacing (negative tracking) on headlines to give the UI a compact, modern feel. Body text remains at 14px for the majority of CRM views to maximize content visibility, while labels use a slightly heavier weight and increased tracking for clarity at small sizes. 

For mobile devices, `display-lg` should scale down to 28px/34px to maintain container integrity while keeping its bold, impactful character.

## Layout & Spacing

The design system follows a **Fixed Grid** approach for internal content containers centered within the viewport, while the navigation remains fixed to the left. 

- **The Grid:** A 12-column layout is used for dashboard views. Gutters are fixed at 24px to ensure distinct separation of data modules.
- **Sidebar:** A constant 240px sidebar houses the neutral-toned navigation.
- **Rhythm:** An 8px base unit governs all padding and margins (8, 16, 24, 32, 48, 64).
- **Responsiveness:** On tablet, the sidebar collapses into a rail or hamburger menu. On mobile, the 12-column grid reflows to a single column with 16px horizontal margins.

## Elevation & Depth

This design system avoids heavy, traditional shadows in favor of **Low-Contrast Outlines** and **Tonal Layers**. 

Depth is communicated through 1px borders using `border_hex`. To distinguish primary surfaces (like a CRM record card) from the background, we use a single, very soft ambient shadow (0px 1px 3px rgba(0,0,0,0.05)). 

When elements are stacked (e.g., a modal or a dropdown), we use a slightly more pronounced shadow with a larger blur but maintain low opacity to keep the interface feeling light and "airy." AI-generated components may use a subtle, tinted glow using the primary color to indicate their automated nature.

## Shapes

The shape language is **Rounded**, favoring a refined 8px (0.5rem) corner radius for most components. This strikes a balance between the clinical sharpness of high-tech tools and the approachability required for a coaching environment.

- **Standard Elements:** Buttons, inputs, and cards use the base `rounded` (8px).
- **Small Elements:** Tooltips and badges use `rounded-sm` (4px).
- **Feature Elements:** KPI cards and large containers use `rounded-lg` (16px) to stand out as distinct architectural blocks.

## Components

- **Buttons:** Primary buttons use a solid Electric Blue fill with white text. Secondary buttons use a subtle gray border with no fill.
- **KPI Cards:** High-contrast modules featuring `display-lg` typography for metrics. Use a subtle top-border accent color (Emerald or Amber) to indicate performance status.
- **Data Tables:** Clean, "borderless" look where rows are separated only by 1px horizontal lines. Headers are `label-sm` with a light gray background.
- **Status Badges:** Subtle background tints with high-contrast text. For example, an "Active Lead" badge uses a 10% opacity Emerald background with 100% opacity Emerald text.
- **Input Fields:** Minimalist design with a 1px border that shifts to Electric Blue on focus. Labels sit outside the field in `label-md` weight.
- **AI Voice Agent Indicators:** Pulsing micro-interactions using the Primary color to show when a voice agent is active or processing data.