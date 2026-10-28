import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When VITE_API_URL is a full URL (not a relative path), proxy /api to it
// so the in-source `BASE` (which is the full URL) still works in dev
// and we don't need to change any code per environment.
function buildProxy() {
  const target = process.env.VITE_API_URL;
  if (!target || target.startsWith('/')) return undefined;
  return { '/api': target };
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: buildProxy(),
  },
})
