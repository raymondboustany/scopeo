import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, DoorOpen, UserRound } from 'lucide-react'
import { Button, Select, Switch } from '@/components/ui/controls'
import { Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { api } from '@/lib/api'
import type { GlobalSettings } from '@/types/domain'
import { tr } from '@/i18n'

const DURATIONS = [1, 4, 8, 12, 24, 72, 168].map((h) => ({
  value: String(h),
  label: h < 24 ? tr(`${h} heure${h > 1 ? 's' : ''}`, `${h} hour${h > 1 ? 's' : ''}`) : tr(`${h / 24} jour${h > 24 ? 's' : ''}`, `${h / 24} day${h > 24 ? 's' : ''}`),
}))

function Row({ icon, title, body, control }: { icon: React.ReactNode; title: string; body: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 max-w-2xl items-start gap-3">
        <span className="mt-0.5 text-ink-3">{icon}</span>
        <span>
          <span className="block text-sm font-medium text-ink">{title}</span>
          <span className="block text-xs leading-relaxed text-ink-3">{body}</span>
        </span>
      </div>
      {control}
    </div>
  )
}

export default function SettingsAdminPage() {
  const { data } = useQuery({ queryKey: ['admin', 'settings'], queryFn: api.admin.settings })
  return data ? <SettingsForm initial={data} /> : null
}

function SettingsForm({ initial }: { initial: GlobalSettings }) {
  const qc = useQueryClient()
  const [data, setData] = useState(initial)
  const [form, setForm] = useState<GlobalSettings>(initial)
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: () => api.admin.saveSettings(form),
    onSuccess: (r) => {
      qc.setQueryData(['admin', 'settings'], r)
      setData(r)
      void qc.invalidateQueries({ queryKey: ['auth-status'] })
      setSaved(true)
    },
  })
  const set = <K extends keyof GlobalSettings>(k: K, v: GlobalSettings[K]) => {
    setForm({ ...form, [k]: v })
    setSaved(false)
  }
  const dirty = JSON.stringify(form) !== JSON.stringify(data)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Administration', 'Administration')}
        title={tr('Réglages', 'Settings')}
        lead={tr('Ce que la page de connexion propose, et combien de temps une session reste ouverte.', 'What the sign-in page offers, and how long a session stays open.')}
      />
      <Card>
        <CardHeader title={tr('Accès', 'Access')} />
        <div className="divide-y divide-rule">
          <Row
            icon={<DoorOpen size={16} />}
            title={tr('Création libre de profils', 'Self-service profile creation')}
            body={tr(
              "Fermée, seul un administrateur crée les comptes (ou l'annuaire, s'il est activé). Recommandé dès que Scopeo est partagé.",
              'When closed, only an administrator creates accounts (or the directory, if on). Recommended as soon as Scopeo is shared.',
            )}
            control={<Switch checked={form.registration_open} onCheckedChange={(v) => set('registration_open', v)} label={tr('Création libre de profils', 'Self-service profile creation')} />}
          />
          <Row
            icon={<UserRound size={16} />}
            title={tr('Mode invité', 'Guest mode')}
            body={tr('Découverte sans compte, sur la démonstration Finexa ; tout est effacé à la déconnexion.', 'Try it without an account, on the Finexa demo; everything is erased on sign-out.')}
            control={<Switch checked={form.guest_enabled} onCheckedChange={(v) => set('guest_enabled', v)} label={tr('Mode invité', 'Guest mode')} />}
          />
          <Row
            icon={<Clock size={16} />}
            title={tr('Durée d’une session', 'Session length')}
            body={tr('Au-delà, une nouvelle connexion est demandée. Les sessions ouvertes gardent leur durée initiale.', 'After this, signing in again is required. Open sessions keep their initial length.')}
            control={
              <div className="w-40">
                <Select value={String(form.session_hours)} onValueChange={(v) => set('session_hours', Number(v))} options={DURATIONS} ariaLabel={tr('Durée d’une session', 'Session length')} />
              </div>
            }
          />
        </div>
        <div className="flex items-center justify-end gap-3 rounded-b-xl border-t border-rule bg-raised px-5 py-3">
          {save.error ? <span className="text-xs text-critical">{save.error.message}</span> : saved ? <span className="text-xs text-positive">{tr('Enregistré.', 'Saved.')}</span> : null}
          <Button variant="primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {tr('Enregistrer', 'Save')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
