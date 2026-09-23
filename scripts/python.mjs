import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Racine du projet et interpréteur Python de l'environnement virtuel du serveur. */
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const serverDir = path.join(root, 'server')
export const venvDir = path.join(serverDir, '.venv')
export const venvPython =
  process.platform === 'win32' ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python')

export function requireVenv() {
  if (!existsSync(venvPython)) {
    console.error("\nL'environnement Python du serveur est absent. Lancez d'abord :\n\n  npm run setup\n")
    process.exit(1)
  }
  return venvPython
}
