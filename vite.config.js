import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Eklentiyi dahil et

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.ico', 'robots.txt'], // Offline olması gereken dosyalar
      manifest: {
        name: 'Todo App',
        short_name: 'Todo',
        description: 'Benim Todo Uygulamam',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // İşte burası kritik: İnternet yoksa her şeyi hafızadan getirir
        globPatterns: ['**/*.{js,css,html,png,svg,mp3}']
      }
    })
  ],
  base: '/'
})