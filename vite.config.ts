import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

/** Dépendances regroupées dans le lot « vendor ». */
const VENDOR = ['react', 'react-dom', 'react-router', '@radix-ui']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // L'API locale tourne à part (FastAPI) : Vite lui relaie les appels.
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(root, 'src')}/` }],
  },
  build: {
    target: 'es2022',
    // Seul le moteur PDF du résumé exécutif dépasse ce seuil ; il n'est chargé qu'à la demande.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        /*
         * Le corpus réglementaire pèse plus lourd que le code : on isole les
         * dépendances volumineuses pour qu'il ne retarde pas le premier
         * affichage de la coquille applicative.
         */
        manualChunks(id: string) {
          if (id.includes('node_modules/d3-')) return 'graph'
          if (VENDOR.some((m) => id.includes(`node_modules/${m}`))) return 'vendor'
          return undefined
        },
      },
    },
  },
})
