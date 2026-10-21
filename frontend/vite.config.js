import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['chrome60', 'edge18', 'firefox60', 'safari11', 'es2015'],
  },
})
