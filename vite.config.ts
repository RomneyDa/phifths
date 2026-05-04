import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/phifths/',
  build: {
    outDir: 'dist/phifths',
    emptyOutDir: true,
  },
})
