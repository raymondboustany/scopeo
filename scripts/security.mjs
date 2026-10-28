import { spawnSync } from 'node:child_process'
import { requireVenv, root, serverDir } from './python.mjs'

/**
 * Contrôles de sécurité locaux, les mêmes que ceux de la CI :
 * dépendances livrées (npm audit), dépendances Python (pip-audit), règles de sécurité du code Python (ruff).
 */
const python = requireVenv()
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const steps = [
  ['npm audit', npm, ['audit', '--omit=dev', '--audit-level=high'], root],
  ['pip-audit', python, ['-m', 'pip_audit', '-r', 'requirements.txt', '--progress-spinner', 'off'], serverDir],
  ['ruff', python, ['-m', 'ruff', 'check', 'app', 'tests'], serverDir],
]
let failed = 0
for (const [label, cmd, args, cwd] of steps) {
  console.log(`\n> ${label}`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && cmd === npm })
  if (r.status !== 0) failed++
}
console.log(failed ? `\n${failed} check(s) failed / contrôle(s) en échec` : '\nAll checks passed / Tous les contrôles sont passés')
process.exit(failed ? 1 : 0)
