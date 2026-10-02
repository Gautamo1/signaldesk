/**
 * SIMULATED FEED — content generation for the source monitor.
 *
 * SignalDesk does NOT scrape or fetch any of the configured URLs. This module
 * produces plausible synthetic findings from per-source template pools so the
 * monitoring experience is realistic in development and demo deployments.
 * The UI labels this explicitly ("Simulated feed") and the README documents it.
 */

export interface SimFinding {
  title: string
  summary: string
  category: string
  confidence: number
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const chance = (p: number) => Math.random() < p

const SHELLS = [
  'Kestrel Trading Ltd',
  'Aldermore Capital LLC',
  'Vantiq Marine SA',
  'Cormorant Holdings BV',
  'Bastion Gate Partners',
  'Larkspur Group FZE',
  'Meridian Holdings Ltd',
  'Pelican Point S.A.',
]
const PEOPLE = ['C. Halvorsen', 'M. Okonkwo', 'D. Reyes', 'S. Lindqvist', 'A. Petrov', 'J. Whitfield']
const PORTS = ['Rotterdam', 'Antwerp', 'Santos', 'Tanjung Pelepas', 'Piraeus', 'Veracruz']
const VESSELS = ['MV Kestrel Bay', 'MT Alder Point', 'MV Cormorant II', 'BS Vantiq Star', 'MV Pelican Rise']
const JURISDICTIONS = ['Cyprus', 'the Marshall Islands', 'the British Virgin Islands', 'Panama', 'Dubai', 'Luxembourg']
const DRUGS = [
  'atorvastatin API',
  'microcrystalline cellulose',
  'halogen-butyl rubber stoppers',
  'lyophilization chamber units',
]
const WATER = [
  'Rio Verde basin allocation permits',
  'Wellfield 3 pumping telemetry',
  'the 1987 riparian easement deed',
  'groundwater level sensor network',
]

type Template = () => Omit<SimFinding, 'confidence' | 'priority'>

const reuters: Template[] = [
  () => ({
    title: `Wire: ${pick(SHELLS)} linked to new ${pick(JURISDICTIONS)} registration wave`,
    summary: `A Reuters wire report references ${pick(SHELLS)} in a batch of corporate registrations filed this week in ${pick(JURISDICTIONS)}. Directors overlap with two entities already under review.`,
    category: 'statement',
    tags: ['shell-companies', 'registrations'],
  }),
  () => ({
    title: `${pick(PORTS)} port authority confirms inspection of ${pick(VESSELS)}`,
    summary: `Port officials confirm a documentation inspection of ${pick(VESSELS)} at ${pick(PORTS)}. Manifest discrepancies were cited; cargo was not detained.`,
    category: 'statement',
    tags: ['logistics', 'vessels'],
  }),
  () => ({
    title: `Trade flows: unusual container re-routing via ${pick(PORTS)}`,
    summary: `Container tracking data shows a spike in transshipments through ${pick(PORTS)} over the past ten days, consistent with the diversion pattern documented in earlier findings.`,
    category: 'dataset',
    tags: ['trade-flows', 'diversion'],
  }),
  () => ({
    title: `Statement from ${pick(PEOPLE)}'s office on procurement review`,
    summary: `An official statement issued by the office of ${pick(PEOPLE)} denies irregularities in the tender process and cites "standard due diligence". No documents were released.`,
    category: 'statement',
    tags: ['statements'],
  }),
]

const ap: Template[] = [
  () => ({
    title: `AP investigation: ${pick(SHELLS)} appears in offshore registry extract`,
    summary: `A registry extract reviewed by AP investigators lists ${pick(SHELLS)} with a nominee director. The extract predates the entity's known involvement by roughly a year.`,
    category: 'document',
    tags: ['offshore', 'registry'],
  }),
  () => ({
    title: `Leaked correspondence references ${pick(DRUGS)} shipment delay`,
    summary: `Correspondence obtained by AP references a delayed shipment of ${pick(DRUGS)} and an internal memo questioning supplier certifications. Two attachments were redacted.`,
    category: 'correspondence',
    tags: ['supply-chain', 'pharma'],
  }),
  () => ({
    title: `Court filing names ${pick(PEOPLE)} in basin water dispute`,
    summary: `A newly docketed filing in the basin water rights dispute names ${pick(PEOPLE)} as an interested party, expanding the set of connected actors identified so far.`,
    category: 'filing',
    tags: ['litigation', 'water'],
  }),
  () => ({
    title: `Satellite imagery shows new berthing activity at ${pick(PORTS)}`,
    summary: `Commercial satellite imagery captured repeated overnight berthing of an unflagged vessel at ${pick(PORTS)}. Vessel identity is pending AIS cross-reference.`,
    category: 'imagery',
    tags: ['imagery', 'vessels'],
  }),
]

const edgar: Template[] = [
  () => ({
    title: `EDGAR: new ${pick(['10-K', '20-F', '8-K'])} filing discloses ${pick(SHELLS)} as counterparty`,
    summary: `A periodic filing lists ${pick(SHELLS)} as a material counterparty with related-party transaction disclosures. The filing was submitted late against the statutory deadline.`,
    category: 'filing',
    tags: ['filings', 'related-party'],
  }),
  () => ({
    title: `EDGAR: insider transaction cluster around ${pick(SHELLS)}`,
    summary: `A cluster of Form 4 disclosures shows coordinated position changes by three insiders within a five-day window, days before the ${pick(SHELLS)} counterparty disclosure.`,
    category: 'filing',
    tags: ['insider-trading', 'filings'],
  }),
  () => ({
    title: `EDGAR: auditor change filed for issuer linked to ${pick(JURISDICTIONS)}`,
    summary: `An 8-K announces a change of independent auditor with an accompanying letter citing "disagreement over disclosure scope". The prior auditor's tenure was under two years.`,
    category: 'filing',
    tags: ['auditor', 'filings'],
  }),
]

const opensanctions: Template[] = [
  () => ({
    title: `OpenSanctions: new match for ${pick(SHELLS)} against sanctions dataset`,
    summary: `A fuzzy-name match links ${pick(SHELLS)} to a sanctioned individual with a shared registered address. Match confidence is moderate; alias evidence is pending.`,
    category: 'dataset',
    tags: ['sanctions', 'entity-matching'],
  }),
  () => ({
    title: `OpenSanctions: director overlap graph updated — ${pick(SHELLS)}`,
    summary: `The entity graph now shows a shared director between ${pick(SHELLS)} and two previously unconnected nodes, tightening the ownership cluster.`,
    category: 'dataset',
    tags: ['ownership', 'entity-matching'],
  }),
]

const ft: Template[] = [
  () => ({
    title: `FT analysis: margin pressure on ${pick(DRUGS)} suppliers`,
    summary: `An FT market analysis notes widening margins for ${pick(DRUGS)} suppliers, with two named vendors tied to the Helios procurement chain.`,
    category: 'statement',
    tags: ['pharma', 'markets'],
  }),
  () => ({
    title: `FT: shipping rates from ${pick(PORTS)} spike on re-routing demand`,
    summary: `Spot rates out of ${pick(PORTS)} rose sharply this week, attributed to re-routing demand consistent with the documented diversion pattern.`,
    category: 'dataset',
    tags: ['markets', 'logistics'],
  }),
]

const riverio: Template[] = [
  () => ({
    title: `Public records: ${pick(WATER)} released under request`,
    summary: `The Water Authority released ${pick(WATER)} in response to a public records request. The release includes three pages previously withheld on privilege grounds.`,
    category: 'document',
    tags: ['water', 'public-records'],
  }),
  () => ({
    title: `Hearing docket updated for basin allocation review`,
    summary: `The administrative docket for the basin allocation review lists a new evidentiary hearing and adds ${pick(PEOPLE)} as counsel of record for one petitioner.`,
    category: 'filing',
    tags: ['water', 'litigation'],
  }),
]

const generic: Template[] = [
  () => ({
    title: `New document published referencing ${pick(SHELLS)}`,
    summary: `A newly published document mentions ${pick(SHELLS)} in a context requiring follow-up. Provenance and full text are pending review.`,
    category: 'document',
    tags: ['follow-up'],
  }),
  () => ({
    title: `Data update: activity detected around ${pick(PEOPLE)}`,
    summary: `A data refresh shows new activity associated with ${pick(PEOPLE)}. Significance is unconfirmed; flagged for triage.`,
    category: 'dataset',
    tags: ['follow-up'],
  }),
]

// Pools are keyed by source CATEGORY so that user-added sources also produce
// plausible simulated findings without per-source configuration.
const POOLS: Record<string, Template[]> = {
  'wire-service': [...reuters, ...ap],
  'regulatory-filings': edgar,
  'sanctions-data': opensanctions,
  'financial-media': ft,
  'public-records': riverio,
  other: generic,
}

/** Generate 0–2 synthetic findings for a source check. */
export function generateFindingsForSource(category: string): SimFinding[] {
  const pool = POOLS[category] ?? generic
  if (!pool.length) return []
  const count = chance(0.15) ? 2 : chance(0.55) ? 1 : 0
  const out: SimFinding[] = []
  for (let i = 0; i < count; i++) {
    const base = pick(pool)()
    const r = Math.random()
    out.push({
      ...base,
      confidence: Math.round(rand(0.38, 0.97) * 100) / 100,
      priority: r < 0.06 ? 'critical' : r < 0.28 ? 'high' : r < 0.75 ? 'medium' : 'low',
    })
  }
  return out
}
