# Seagull Science Academy

A modern React + Tailwind CSS website for Seagull Academy, featuring a beautiful home page with accessibility features, microinteractions, and responsive design.

## Features

- 🎨 **Custom Color Palette**: Purple-based theme with Grape, Eminence, African Violet, and Jet colors
- ♿ **Accessibility**: Full keyboard navigation, focus rings, ARIA labels, and skip-to-content links
- 📱 **Responsive Design**: Mobile-first approach with hamburger menu
- ✨ **Microinteractions**: Hover effects, transitions, and subtle animations
- 🔔 **Toast Notifications**: Success, error, and info messages with auto-hide
- 🎠 **Interactive Carousel**: Auto-advancing mentor showcase with manual controls
- 🎯 **Modern UI**: Clean, professional design with proper typography hierarchy

## Tech Stack

- React 19
- Tailwind CSS 3
- Heroicons
- React Router DOM

## Getting Started

1. **Install dependencies** (run this manually since PowerShell isn't working):
   ```bash
   npm install @heroicons/react
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── Header.jsx          # Navigation header with mobile menu
│   ├── Footer.jsx          # Footer with contact info and links
│   └── ui/
│       ├── Spinner.jsx     # Loading spinner component
│       └── Toast.jsx       # Toast notification system
├── data/
│   └── home.json           # Home page content data
├── pages/
│   └── Home.jsx            # Main home page component
└── App.jsx                 # App wrapper with routing
```

## Color Palette

- **Grape** (#6600a6): Primary brand color, headers, primary buttons
- **Eminence** (#6c198e): Secondary surfaces, section headings
- **African Violet** (#be88d3): Accents, hover states, loaders
- **Jet** (#453b44): Dark text, footer background
- **Gold** (#f2c94c): Badge accents
- **White** (#ffffff): Backgrounds, high-contrast text

## Accessibility Features

- Skip-to-content link
- Proper heading hierarchy
- Focus management
- Keyboard navigation support
- ARIA labels and roles
- Screen reader friendly
- High contrast ratios

## Build

```bash
npm run build
```

## Preview Build

```bash
npm run preview
```
# SeagullScienceAcademy
