import { spawnSync } from 'node:child_process'
import { requireVenv, serverDir } from './python.mjs'

/** Tests de l'API locale (pytest), sur une base temporaire. */
const r = spawnSync(requireVenv(), ['-m', 'pytest', '-q', '-p', 'no:warnings', ...process.argv.slice(2)], { cwd: serverDir, stdio: 'inherit' })
process.exit(r.status ?? 1)
