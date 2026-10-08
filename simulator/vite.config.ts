import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Yo'ldosh AI simulyatori: build natijasi ../yoldosh/sim ga yoziladi (ilovaning /sim/ sahifasi).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '../yoldosh/sim', emptyOutDir: true, chunkSizeWarningLimit: 2500, sourcemap: false },
})
