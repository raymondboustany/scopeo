import { spawn } from 'node:child_process'
import { requireVenv, root, serverDir } from './python.mjs'

/**
 * Lance ensemble l'API locale (FastAPI, port 8000) et l'interface (Vite,
 * port 5173). Vite relaie /api vers FastAPI ; arrêter l'un arrête l'autre.
 *
 * `--serve` lance seulement le serveur, qui sert alors l'application compilée.
 */
const python = requireVenv()
const serveOnly = process.argv.includes('--serve')
const port = process.env.SCOPEO_PORT ?? '8000'
const host = process.env.SCOPEO_HOST ?? '127.0.0.1'

const procs = []
function start(name, cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npx' })
  p.on('exit', (code) => {
    console.log(`[${name}] arrêté (${code ?? 0}).`)
    shutdown(code ?? 0)
  })
  procs.push(p)
}

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const p of procs) if (!p.killed) p.kill()
  process.exit(code)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start('api', python, ['-m', 'uvicorn', 'app.main:app', '--host', host, '--port', port, ...(serveOnly ? [] : ['--reload'])], serverDir)
if (serveOnly) {
  console.log(`\nScopeo : http://${host === '0.0.0.0' ? 'localhost' : host}:${port}\n`)
} else {
  start('web', 'npx', ['vite'], root)
}
