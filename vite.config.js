import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // KRİTİK: Dosyaların /assets/ şeklinde doğru yollardan çekilmesini sağlar
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Build dosyasını hafifletir
  }
})