import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { serverDir, venvDir, venvPython } from './python.mjs'

/** Crée l'environnement Python du serveur local et installe ses dépendances. */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: serverDir })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

if (!existsSync(venvPython)) {
  const candidates = process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python']
  const python = candidates.find((c) => spawnSync(c, ['--version'], { stdio: 'ignore' }).status === 0)
  if (!python) {
    console.error('Python 3.11 ou plus récent est requis : https://www.python.org/downloads/')
    process.exit(1)
  }
  console.log(`Création de l'environnement Python dans ${path.relative(process.cwd(), venvDir)}…`)
  run(python, ['-m', 'venv', '.venv'])
}
run(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', 'requirements-dev.txt'])
console.log('Serveur local prêt.')
