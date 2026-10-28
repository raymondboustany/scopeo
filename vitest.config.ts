import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Logique métier : moteurs réglementaires, données et utilitaires.
      include: ['src/engines/**', 'src/data/**', 'src/lib/**'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'html'],
      // Seuils plancher : la CI échoue si la couverture baisse.
      thresholds: { statements: 55, branches: 55, functions: 40, lines: 55 },
    },
  },
})
