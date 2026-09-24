import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import { CornerDownLeft, Search } from 'lucide-react'
import { KIND_LABEL, type SearchKind, type SearchRecord } from '@/lib/search.types'
import { NAV } from './nav'
import { cn } from '@/lib/utils'
import { RegChip } from '@/components/ui/primitives'
import type { RegulationId } from '@/types/domain'
import { tr } from '@/i18n'

const REG_IDS = new Set(['RGPD', 'NIS2', 'DORA', 'CRA', 'AIACT'])

const KIND_ORDER: SearchKind[] = ['obligation', 'theme', 'recyf', 'iso', 'echeance']

/** Référence stable, pour ne pas invalider les calculs à chaque rendu. */
const EMPTY: SearchRecord[] = []

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState<SearchRecord[]>([])
  const navigate = useNavigate()

  const active = query.trim().length >= 2
  // Les résultats chargés ne sont retenus que si la saisie est encore
  // exploitable : on évite ainsi de remettre l'état à zéro depuis un effet.
  const results = useMemo(() => (active ? loaded : EMPTY), [active, loaded])

  /*
   * L'index porte tout le corpus : le charger avec la barre de navigation
   * alourdirait le premier affichage de chaque écran. Il est donc importé à
   * la première frappe, puis conservé par le cache de modules.
   */
  useEffect(() => {
    if (!active) return
    let cancelled = false
    void import('@/lib/search').then(({ search }) => {
      if (!cancelled) setLoaded(search(query, 30))
    })
    return () => {
      cancelled = true
    }
  }, [query, active])

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('')
    onOpenChange(next)
  }

  const grouped = useMemo(() => {
    const map = new Map<SearchKind, SearchRecord[]>()
    for (const r of results) {
      const arr = map.get(r.kind) ?? []
      arr.push(r)
      map.set(r.kind, arr)
    }
    return KIND_ORDER.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const)
  }, [results])

  const go = (route: string) => {
    handleOpenChange(false)
    navigate(route)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(10_12_16_/_0.45)] backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-rule bg-surface shadow-modal"
        >
          <Dialog.Title className="sr-only">{tr('Recherche dans le corpus réglementaire', 'Search the regulatory corpus')}</Dialog.Title>
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-2.5 border-b border-rule px-3.5">
              <Search size={15} className="shrink-0 text-ink-3" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder={tr('Article, exigence, thème de croisement, objectif ReCyF, contrôle ISO…', 'Article, requirement, crosswalk theme, ReCyF objective, ISO control…')}
                className="h-12 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4"
              />
              <kbd className="shrink-0 rounded-[5px] border border-rule-2 bg-raised px-1.5 py-px text-[10px] font-medium text-ink-3">
                esc
              </kbd>
            </div>

            <Command.List className="max-h-[54vh] overflow-y-auto p-1.5">
              {!active ? (
                <Command.Group heading={<GroupLabel>{tr('Accès rapide', 'Quick access')}</GroupLabel>}>
                  {NAV.map((n) => (
                    <Item key={n.to} onSelect={() => go(n.to)}>
                      <span className="text-ink-3">{n.icon}</span>
                      <span className="flex-1 truncate text-ink-2">{n.label}</span>
                    </Item>
                  ))}
                </Command.Group>
              ) : results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-ink-3">
                  {tr(`Aucun résultat pour « ${query} ».`, `No results for "${query}".`)}
                  <div className="mt-1 text-xs text-ink-4">
                    {tr(
                      'La recherche porte sur les articles, les exigences, les croisements, le ReCyF et les contrôles ISO 27001.',
                      'Search covers articles, requirements, crosswalk themes, the ReCyF and ISO 27001 controls.',
                    )}
                  </div>
                </div>
              ) : (
                grouped.map(([kind, items]) => (
                  <Command.Group key={kind} heading={<GroupLabel>{KIND_LABEL[kind]}</GroupLabel>}>
                    {items.map((r) => (
                      <Item key={r.id} onSelect={() => go(r.route)}>
                        {r.tag && REG_IDS.has(r.tag) ? (
                          <RegChip id={r.tag as RegulationId} size="sm" />
                        ) : (
                          <span className="ref w-14 shrink-0 truncate text-ink-4">{r.id}</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{r.title}</span>
                          <span className="ref block truncate text-ink-4">{r.reference}</span>
                        </span>
                        <CornerDownLeft
                          size={12}
                          className="shrink-0 text-ink-4 opacity-0 group-data-[selected=true]:opacity-100"
                        />
                      </Item>
                    ))}
                  </Command.Group>
                ))
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <span className="label-caps px-2">{children}</span>
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm outline-none',
        'data-[selected=true]:bg-sunken',
      )}
    >
      {children}
    </Command.Item>
  )
}
