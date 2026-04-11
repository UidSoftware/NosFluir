import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/sistema/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Nos Studio Fluir',
        short_name: 'Studio Fluir',
        description: 'Sistema de Gestão Studio Fluir',
        theme_color: '#151329',
        background_color: '#151329',
        display: 'standalone',
        start_url: '/sistema/',
        icons: [
          {
            src: '/static/landing/Icone-401x401-Sem-Fundo.png',
            sizes: '401x401',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
