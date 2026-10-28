import { spawnSync } from 'node:child_process'
import { requireVenv, serverDir } from './python.mjs'

/** Analyse du code Python du serveur (ruff : qualité et règles de sécurité). */
const r = spawnSync(requireVenv(), ['-m', 'ruff', 'check', 'app', 'tests', ...process.argv.slice(2)], { cwd: serverDir, stdio: 'inherit' })
process.exit(r.status ?? 1)
