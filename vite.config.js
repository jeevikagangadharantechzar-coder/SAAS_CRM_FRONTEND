import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'



// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: "window", // Define global to fix the error
  },
  build: {
    chunkSizeWarningLimit: 5000, // Safe threshold to prevent warnings for large unified bundles
  },
})

