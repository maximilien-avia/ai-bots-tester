import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/webhook': {
        target: 'https://n8n.srv761186.hstgr.cloud',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
