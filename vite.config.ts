import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// vitest 2.x は vite5 を同梱しており、`/// <reference types="vitest/config" />` の
// UserConfig 拡張が本体の vite6 に効かないため、ここで直接拡張する
declare module 'vite' {
  interface UserConfig {
    test?: import('vitest/node').InlineConfig
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'スイムランク - マスターズ水泳ランク判定',
        short_name: 'スイムランク',
        lang: 'ja',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#0b5cd6',
        background_color: '#0b5cd6',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
