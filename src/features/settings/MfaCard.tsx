import { useState } from 'react'
import { Check, Copy, Download, KeyRound, RefreshCw, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, Input } from '@/components/ui/controls'
import { Card, CardHeader, Tag } from '@/components/ui/primitives'
import { CodeInput } from '@/components/auth/fields'
import { api } from '@/lib/api'
import { keys } from '@/lib/queries'
import type { MfaSetup, UserProfile } from '@/types/domain'
import { cn } from '@/lib/utils'
import { tr } from '@/i18n'

type Flow = null | 'setup' | 'codes' | 'renew' | 'disable'

/**
 * Double authentification (TOTP), facultative et propre à chaque profil.
 *
 * Activation en trois temps : mot de passe, QR code à scanner, premier code
 * pour confirmer. Les codes de récupération ne sont montrés qu'une fois.
 */
export function MfaCard({ user }: { user: UserProfile }) {
  const qc = useQueryClient()
  const [flow, setFlow] = useState<Flow>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [codes, setCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const reset = () => {
    setFlow(null)
    setPassword('')
    setCode('')
    setSetup(null)
    setError(null)
    setShowSecret(false)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const refresh = () => qc.invalidateQueries({ queryKey: keys.me })
  const directory = user.auth_source === 'ldap'
  const passwordLabel = directory ? tr("Mot de passe de l'annuaire", 'Directory password') : tr('Mot de passe', 'Password')

  return (
    <Card>
      <CardHeader
        title={tr('Double authentification', 'Two-factor authentication')}
        subtitle={tr(
          "Facultative. À chaque connexion, un code à six chiffres généré par une application (Microsoft Authenticator, Google Authenticator, FreeOTP…) s'ajoute au mot de passe.",
          'Optional. At each sign-in, a six-digit code from an app (Microsoft Authenticator, Google Authenticator, FreeOTP…) is required in addition to the password.',
        )}
        icon={<ShieldCheck size={16} />}
        aside={user.mfa_enabled ? <Tag tone="positive">{tr('Activée', 'On')}</Tag> : <Tag>{tr('Désactivée', 'Off')}</Tag>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="max-w-xl text-xs leading-relaxed text-ink-3">
          {user.mfa_enabled
            ? tr(
                `Codes de récupération restants : ${user.recovery_codes_left} sur 10. Si vous perdez votre téléphone et vos codes, un administrateur peut désactiver la double authentification de votre compte.`,
                `Recovery codes left: ${user.recovery_codes_left} of 10. If you lose your phone and your codes, an administrator can turn off two-factor authentication on your account.`,
              )
            : tr(
                'Recommandée pour les comptes administrateurs et pour tout poste partagé.',
                'Recommended for administrator accounts and any shared machine.',
              )}
        </p>
        <div className="flex flex-wrap gap-2">
          {user.mfa_enabled ? (
            <>
              <Button icon={<RefreshCw size={14} />} onClick={() => setFlow('renew')}>
                {tr('Nouveaux codes de récupération', 'New recovery codes')}
              </Button>
              <Button variant="danger" icon={<ShieldOff size={14} />} onClick={() => setFlow('disable')}>
                {tr('Désactiver', 'Turn off')}
              </Button>
            </>
          ) : (
            <Button variant="primary" icon={<Smartphone size={14} />} onClick={() => setFlow('setup')}>
              {tr('Activer', 'Turn on')}
            </Button>
          )}
        </div>
      </div>

      {/* Activation ---------------------------------------------------------- */}
      <Dialog
        open={flow === 'setup'}
        onOpenChange={(v) => (v ? null : reset())}
        title={tr('Activer la double authentification', 'Turn on two-factor authentication')}
        description={setup ? tr('Étape 2 sur 2 : scanner, puis confirmer', 'Step 2 of 2: scan, then confirm') : tr('Étape 1 sur 2 : confirmer votre identité', 'Step 1 of 2: confirm your identity')}
        footer={
          setup ? (
            <>
              <Button onClick={reset}>{tr('Annuler', 'Cancel')}</Button>
              <Button
                variant="primary"
                disabled={code.length !== 6 || busy}
                onClick={() =>
                  run(async () => {
                    const { codes: fresh } = await api.mfaEnable(code)
                    setCodes(fresh)
                    setSetup(null)
                    setCode('')
                    setFlow('codes')
                    await refresh()
                  })
                }
              >
                {tr('Activer', 'Turn on')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={reset}>{tr('Annuler', 'Cancel')}</Button>
              <Button
                variant="primary"
                disabled={!password || busy}
                onClick={() =>
                  run(async () => {
                    setSetup(await api.mfaSetup(password))
                    setPassword('')
                  })
                }
              >
                {tr('Continuer', 'Continue')}
              </Button>
            </>
          )
        }
      >
        {setup ? (
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div
              className="rounded-lg border border-rule bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label={tr('QR code à scanner', 'QR code to scan')}
              // SVG produit par le serveur à partir d'une URI otpauth : aucune donnée saisie par l'utilisateur.
              dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
            />
            <div className="space-y-3 text-sm text-ink-2">
              <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed">
                <li>{tr("Ouvrez votre application d'authentification et ajoutez un compte.", 'Open your authenticator app and add an account.')}</li>
                <li>{tr('Scannez le QR code.', 'Scan the QR code.')}</li>
                <li>{tr('Saisissez le code à six chiffres affiché.', 'Enter the six-digit code shown.')}</li>
              </ol>
              <button type="button" className="text-2xs text-ink-3 underline-offset-2 hover:text-ink hover:underline" onClick={() => setShowSecret((v) => !v)}>
                {showSecret ? tr('Masquer la clé', 'Hide the key') : tr('Impossible de scanner ? Afficher la clé', 'Cannot scan? Show the key')}
              </button>
              {showSecret ? <code className="block break-all rounded-md bg-raised px-2 py-1.5 font-mono text-2xs text-ink">{setup.secret}</code> : null}
              <CodeInput value={code} onChange={setCode} autoFocus />
            </div>
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{passwordLabel}</span>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
        )}
        {error ? <p role="alert" className="mt-3 text-xs text-critical">{error}</p> : null}
      </Dialog>

      {/* Renouvellement des codes -------------------------------------------- */}
      <Dialog
        open={flow === 'renew'}
        onOpenChange={(v) => (v ? null : reset())}
        title={tr('Nouveaux codes de récupération', 'New recovery codes')}
        description={tr('Les codes actuels cesseront de fonctionner.', 'The current codes will stop working.')}
        footer={
          <>
            <Button onClick={reset}>{tr('Annuler', 'Cancel')}</Button>
            <Button
              variant="primary"
              disabled={code.length !== 6 || busy}
              onClick={() =>
                run(async () => {
                  const { codes: fresh } = await api.mfaRecoveryCodes(code)
                  setCodes(fresh)
                  setCode('')
                  setFlow('codes')
                  await refresh()
                })
              }
            >
              {tr('Générer', 'Generate')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-ink-3">{tr("Confirmez avec un code de votre application.", 'Confirm with a code from your app.')}</p>
        <CodeInput value={code} onChange={setCode} autoFocus />
        {error ? <p role="alert" className="mt-3 text-xs text-critical">{error}</p> : null}
      </Dialog>

      {/* Désactivation -------------------------------------------------------- */}
      <Dialog
        open={flow === 'disable'}
        onOpenChange={(v) => (v ? null : reset())}
        title={tr('Désactiver la double authentification ?', 'Turn off two-factor authentication?')}
        description={tr('Seul le mot de passe sera demandé à la connexion.', 'Only the password will be asked at sign-in.')}
        footer={
          <>
            <Button onClick={reset}>{tr('Annuler', 'Cancel')}</Button>
            <Button
              variant="danger"
              disabled={!password || code.length !== 6 || busy}
              onClick={() =>
                run(async () => {
                  await api.mfaDisable(password, code)
                  reset()
                  await refresh()
                })
              }
            >
              {tr('Désactiver', 'Turn off')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{passwordLabel}</span>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr("Code de l'application", 'App code')}</span>
            <CodeInput value={code} onChange={setCode} />
          </label>
        </div>
        {error ? <p role="alert" className="mt-3 text-xs text-critical">{error}</p> : null}
      </Dialog>

      <RecoveryCodesDialog codes={flow === 'codes' ? codes : []} name={user.name} onClose={() => { setCodes([]); reset() }} />
    </Card>
  )
}

function RecoveryCodesDialog({ codes, name, onClose }: { codes: string[]; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [kept, setKept] = useState(false)
  const text = codes.join('\n')

  const download = () => {
    const header = tr(`Scopeo : codes de récupération de « ${name} »`, `Scopeo: recovery codes for "${name}"`)
    const note = tr('Chaque code ne sert qu’une fois. Conservez ce fichier en lieu sûr.', 'Each code works only once. Keep this file somewhere safe.')
    const blob = new Blob([`${header}\n${note}\n\n${text}\n`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'scopeo-recovery-codes.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    setKept(true)
  }

  return (
    <Dialog
      open={codes.length > 0}
      onOpenChange={(v) => (v ? null : onClose())}
      title={tr('Vos codes de récupération', 'Your recovery codes')}
      description={tr('Ils ne seront plus affichés. Chacun remplace une fois le code de l’application.', 'They will not be shown again. Each one replaces the app code once.')}
      footer={
        <Button variant="primary" disabled={!kept} onClick={onClose}>
          {tr("C'est noté", 'Done')}
        </Button>
      }
    >
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-rule bg-raised p-3 font-mono text-sm text-ink">
        {codes.map((c) => (
          <li key={c} className="text-center tracking-wider">
            {c}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button icon={<Download size={14} />} onClick={download}>
          {tr('Télécharger', 'Download')}
        </Button>
        <Button
          icon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={async () => {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setKept(true)
          }}
        >
          {copied ? tr('Copiés', 'Copied') : tr('Copier', 'Copy')}
        </Button>
      </div>
      <label className={cn('mt-4 flex items-center gap-2 text-xs text-ink-2')}>
        <input type="checkbox" checked={kept} onChange={(e) => setKept(e.target.checked)} className="size-3.5 accent-[var(--c-accent)]" />
        <KeyRound size={13} className="text-ink-3" />
        {tr('Je les ai conservés en lieu sûr', 'I have stored them somewhere safe')}
      </label>
    </Dialog>
  )
}
