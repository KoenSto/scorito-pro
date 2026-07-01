import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /scorito-pro/
export default defineConfig({
  base: '/scorito-pro/',
  plugins: [react()],
})
