import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'Traveller 2',
        short_name: 'Traveller',
        description: 'Your Best Travel Companion',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'app-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'app-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
