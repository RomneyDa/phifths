import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds with /phifths/ as the base path so the app can be served at
// dallinromney.com/phifths via a Next.js rewrite from the gateway site.
// Output is nested under dist/phifths/ so Vercel (which serves dist/ at root)
// resolves /phifths/index.html and /phifths/assets/* directly.
export default defineConfig({
  plugins: [react()],
  base: '/phifths/',
  build: {
    outDir: 'dist/phifths',
    emptyOutDir: true,
  },
})
