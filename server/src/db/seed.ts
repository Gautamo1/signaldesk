import { config } from '../config.js'
import { q, qOne } from './pool.js'
import { recomputeTags } from './tags.js'

/**
 * Seed an empty database with a realistic research world so the app is
 * meaningful on first launch. Runs only when `projects` is empty and
 * SEED_ON_EMPTY is not "false".
 */

type Priority = 'low' | 'medium' | 'high' | 'critical'

interface SeedFinding {
  t: string
  s: string
  c: string
  tags: string[]
  p: Priority
}

const SOURCES_SEED = [
  { key: 'reuters', name: 'Reuters World Desk', url: 'https://www.reuters.com/world/', category: 'wire-service', interval: 5, notes: 'General wire coverage; primary signal for cluster entities.' },
  { key: 'ap', name: 'AP Investigations', url: 'https://apnews.com/hub/investigations', category: 'wire-service', interval: 15, notes: 'Investigative and court-reporting desk.' },
  { key: 'edgar', name: 'SEC EDGAR Filings', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany', category: 'regulatory-filings', interval: 30, notes: 'Periodic and event filings for issuers in the cluster.' },
  { key: 'opensanctions', name: 'OpenSanctions Registry', url: 'https://data.opensanctions.org/', category: 'sanctions-data', interval: 60, notes: 'Entity matching against consolidated sanctions datasets.' },
  { key: 'ft', name: 'FT Markets & Corporate', url: 'https://www.ft.com/markets', category: 'financial-media', interval: 60, notes: 'Market analysis and corporate reporting.' },
  { key: 'riverio', name: 'Rio Verde Basin Water Authority', url: 'https://water.riveriovallej.gov/reports', category: 'public-records', interval: 360, notes: 'Public records releases and hearing dockets for the basin dispute.' },
]

const MERIDIAN: SeedFinding[] = [
  { t: 'EDGAR 10-K discloses Kestrel Trading Ltd as material counterparty', s: "Meridian Holdings' latest 10-K lists Kestrel Trading Ltd with related-party transaction disclosures. The filing was submitted nine days past the statutory deadline.", c: 'filing', tags: ['filings', 'related-party'], p: 'high' },
  { t: 'Cypriot registry extract shows shared nominee director', s: 'A Cypriot registry extract names a nominee director shared between Meridian Holdings Ltd and two shell entities previously identified in the cluster.', c: 'document', tags: ['offshore', 'ownership'], p: 'critical' },
  { t: 'Form 4 cluster: three insiders adjust positions within five days', s: 'Coordinated Form 4 disclosures show three insiders adjusting positions within a five-day window, days before the Kestrel counterparty disclosure.', c: 'filing', tags: ['insider-trading'], p: 'high' },
  { t: "Auditor change letter cites 'disagreement over disclosure scope'", s: 'An 8-K announces a change of independent auditor. The accompanying letter cites a disagreement over disclosure scope; the prior auditor served under two years.', c: 'correspondence', tags: ['auditor'], p: 'medium' },
  { t: 'OpenSanctions match: Meridian alias overlaps sanctioned individual', s: 'Fuzzy-name matching links a Meridian alias to a sanctioned individual with a shared registered address. Match confidence is moderate; alias evidence is pending.', c: 'dataset', tags: ['sanctions', 'entity-matching'], p: 'critical' },
  { t: 'Vantiq Marine SA appears in shipping manifest set', s: 'A shipping manifest set references Vantiq Marine SA as consignee on three cargo movements. The entity was not previously part of the cluster map.', c: 'document', tags: ['logistics'], p: 'medium' },
  { t: 'Wire: new BVI registration wave references cluster entities', s: 'A wire report references a batch of corporate registrations filed in the British Virgin Islands, two of which name directors already identified in the cluster.', c: 'statement', tags: ['shell-companies', 'registrations'], p: 'medium' },
  { t: 'Bank records excerpt shows intercompany transfers via Aldermore Capital', s: 'A redacted bank records excerpt shows monthly intercompany transfers routed through Aldermore Capital LLC, consistent with the hypothesized cash-flow path.', c: 'dataset', tags: ['finance', 'ownership'], p: 'high' },
  { t: 'Cormorant Holdings BV annual return filed late', s: 'The annual return for Cormorant Holdings BV was filed six weeks past deadline. Director details match the nominee pattern observed in the cluster.', c: 'filing', tags: ['filings'], p: 'low' },
  { t: "Statement from C. Halvorsen's office denies irregularities", s: 'An official statement issued by the office of C. Halvorsen denies irregularities in the tender process and cites "standard due diligence". No documents were released.', c: 'statement', tags: ['statements'], p: 'medium' },
  { t: 'Pelican Point S.A. directorship overlaps with cluster nominee', s: 'A registry update shows Pelican Point S.A. appointing a director who also serves on two cluster entities, tightening the ownership graph.', c: 'dataset', tags: ['ownership', 'entity-matching'], p: 'high' },
  { t: 'Prior-year 20-F omits Kestrel despite materiality threshold', s: "The prior year's 20-F does not disclose Kestrel Trading Ltd even though the transaction volume exceeded the stated materiality threshold.", c: 'filing', tags: ['filings', 'disclosure'], p: 'critical' },
]

const ROTTERDAM: SeedFinding[] = [
  { t: 'Container tracking: transshipment spike via Tanjung Pelepas', s: 'Container tracking data shows a spike in transshipments through Tanjung Pelepas over the past ten days, consistent with the documented diversion pattern.', c: 'dataset', tags: ['trade-flows', 'diversion'], p: 'high' },
  { t: 'Port authority confirms documentation inspection of MV Kestrel Bay', s: 'Port officials confirm a documentation inspection of MV Kestrel Bay. Manifest discrepancies were cited; cargo was not detained.', c: 'statement', tags: ['logistics', 'vessels'], p: 'medium' },
  { t: 'AIS gap: MT Alder Point dark for 14 hours near Antwerp', s: 'AIS data shows MT Alder Point transmitting no position for 14 hours in a corridor consistent with ship-to-ship transfer operations.', c: 'dataset', tags: ['vessels', 'imagery'], p: 'critical' },
  { t: 'Satellite imagery: unflagged vessel berths overnight at Piraeus', s: 'Commercial satellite imagery captures repeated overnight berthing of an unflagged vessel at Piraeus. Vessel identity is pending AIS cross-reference.', c: 'imagery', tags: ['imagery', 'vessels'], p: 'high' },
  { t: 'Spot rates out of Rotterdam rise on re-routing demand', s: 'Spot rates out of Rotterdam rose sharply this week, attributed to re-routing demand consistent with the documented diversion pattern.', c: 'dataset', tags: ['markets', 'logistics'], p: 'low' },
  { t: 'Customs release references manifest discrepancy for container batch RT-4471', s: 'A customs release references a manifest discrepancy for container batch RT-4471. The discrepancy was resolved without detention.', c: 'document', tags: ['customs'], p: 'high' },
  { t: 'Leaked memo questions supplier certifications for diverted cargo', s: 'Correspondence obtained via leak references an internal memo questioning supplier certifications for the diverted cargo. Two attachments were redacted.', c: 'correspondence', tags: ['supply-chain'], p: 'medium' },
  { t: 'Bastion Gate Partners listed as freight forwarder of record', s: 'Shipping documents list Bastion Gate Partners as freight forwarder of record on three affected movements. The firm is not in the cluster map.', c: 'dataset', tags: ['ownership', 'logistics'], p: 'medium' },
  { t: "Wire: trade association disputes 'diversion' characterization", s: 'A trade association statement disputes the characterization of the re-routed cargo as diverted, citing normal seasonal patterns.', c: 'statement', tags: ['statements'], p: 'low' },
  { t: 'SSO window overlaps with customs hold release', s: 'The documented ship-to-ship transfer window for MT Alder Point overlaps with the release of a customs hold on the same cargo batch.', c: 'document', tags: ['customs', 'vessels'], p: 'critical' },
]

const HELIOS: SeedFinding[] = [
  { t: 'Correspondence references delayed atorvastatin API shipment', s: 'Correspondence references a delayed shipment of atorvastatin API and an internal memo questioning supplier certifications.', c: 'correspondence', tags: ['supply-chain', 'pharma'], p: 'medium' },
  { t: 'FT analysis: margin pressure on stopper suppliers', s: 'An FT market analysis notes widening margins for halogen-butyl rubber stopper suppliers, with two named vendors tied to the Helios procurement chain.', c: 'statement', tags: ['pharma', 'markets'], p: 'low' },
  { t: 'Supplier audit report withholds two certification pages', s: 'A supplier audit report withholds two certification pages on privilege grounds. The withheld pages concern lot traceability for microcrystalline cellulose.', c: 'document', tags: ['pharma', 'compliance'], p: 'high' },
  { t: 'Excipient lot trace shows shared manufacturing date anomaly', s: 'Lot tracing across two excipient vendors reveals a shared manufacturing date that predates one vendor\'s stated capacity expansion.', c: 'dataset', tags: ['supply-chain'], p: 'medium' },
  { t: 'Customs hold on lyophilization chamber units released', s: 'A customs hold on a shipment of lyophilization chamber units was released after documentation corrections. No penalty was recorded.', c: 'statement', tags: ['logistics', 'pharma'], p: 'low' },
  { t: 'Internal memo questions halogen-butyl rubber stopper sourcing', s: 'An internal procurement memo questions the sourcing path for halogen-butyl rubber stoppers and requests a re-certification from the primary vendor.', c: 'correspondence', tags: ['pharma', 'compliance'], p: 'high' },
  { t: 'Vendor master data shows duplicate supplier records', s: 'The vendor master contains two records for what appears to be the same stopper supplier, with differing tax registrations and banking details.', c: 'dataset', tags: ['compliance'], p: 'medium' },
  { t: 'Third-party lab report confirms potency within specification', s: 'A third-party laboratory report confirms that sampled lots are within potency specification. The report covers only two of the five questioned lots.', c: 'document', tags: ['pharma', 'quality'], p: 'low' },
]

const RIVERIO: SeedFinding[] = [
  { t: 'Public records: Wellfield 3 pumping telemetry released under request', s: 'The Water Authority released Wellfield 3 pumping telemetry in response to a public records request, including three pages previously withheld.', c: 'document', tags: ['water', 'public-records'], p: 'medium' },
  { t: 'Hearing docket adds D. Reyes as counsel for petitioner', s: 'The administrative docket for the basin allocation review lists a new evidentiary hearing and adds D. Reyes as counsel of record for one petitioner.', c: 'filing', tags: ['litigation', 'water'], p: 'low' },
  { t: 'Groundwater sensor network shows 14% drawdown anomaly', s: 'Telemetry from the groundwater sensor network shows a 14% drawdown anomaly in the eastern basin over six weeks, unexplained by seasonal patterns.', c: 'dataset', tags: ['water', 'environment'], p: 'high' },
  { t: 'The 1987 riparian easement deed surfaces in records release', s: 'A records release includes the 1987 riparian easement deed, which assigns water rights to an entity that later became part of a larger holding structure.', c: 'document', tags: ['water', 'public-records'], p: 'medium' },
  { t: 'Allocation permit application filed by undisclosed entity', s: 'A new allocation permit application was filed by an entity with no public ownership record. The applicant\'s registered agent matches a nominee used in the Meridian cluster.', c: 'filing', tags: ['water', 'litigation'], p: 'critical' },
  { t: 'Petitioner brief cites telemetry gaps as evidence of concealment', s: 'A petitioner brief argues that gaps in the pumping telemetry record constitute evidence of deliberate concealment of extraction volumes.', c: 'document', tags: ['litigation'], p: 'medium' },
  { t: 'Authority statement: records withheld on privilege grounds', s: 'The Authority issued a statement explaining that additional records were withheld on privilege grounds pending the ongoing administrative review.', c: 'statement', tags: ['public-records'], p: 'low' },
]

const LANTERN: SeedFinding[] = [
  { t: 'Cluster account graph updated: 12 new nodes linked', s: 'The account graph for the Lantern cluster was updated with 12 newly linked nodes, mostly registration accounts created within a two-day window.', c: 'dataset', tags: ['disinfo', 'osint'], p: 'low' },
  { t: 'Shared payment rail identified across cluster accounts', s: 'Payment metadata identifies a shared payment rail used by at least nine cluster accounts. The rail is associated with a mix-and-match service.', c: 'dataset', tags: ['disinfo', 'finance'], p: 'medium' },
  { t: 'Archive capture of removed coordination thread', s: 'An archived copy was captured of a removed coordination thread referencing scheduling language for an amplification campaign.', c: 'document', tags: ['disinfo'], p: 'low' },
  { t: 'Bot detection model flags coordinated amplification window', s: 'The bot-detection model flags a coordinated amplification window across 40+ accounts, with engagement patterns consistent with automation.', c: 'dataset', tags: ['disinfo', 'osint'], p: 'low' },
]

const UNASSIGNED: SeedFinding[] = [
  { t: 'Wire: Larkspur Group FZE registration confirmed in Dubai', s: 'A wire report confirms the registration of Larkspur Group FZE in Dubai, with a service provider also used by two entities under review.', c: 'statement', tags: ['shell-companies'], p: 'medium' },
  { t: 'OpenSanctions graph update adds edge to unreviewed node', s: 'A registry refresh added an ownership edge from a reviewed cluster entity to an unreviewed node. The node has no public activity yet.', c: 'dataset', tags: ['entity-matching'], p: 'low' },
  { t: 'New court filing names J. Whitfield as interested party', s: 'A newly docketed filing names J. Whitfield as an interested party in a commercial dispute, expanding the set of connected actors.', c: 'filing', tags: ['litigation'], p: 'medium' },
  { t: 'Commercial imagery shows new yard activity at Santos', s: 'Commercial imagery shows new container yard activity at Santos consistent with additional staging capacity. Attribution is pending.', c: 'imagery', tags: ['logistics'], p: 'low' },
  { t: 'Registry extract lists S. Lindqvist as alternate signatory', s: 'A registry extract lists S. Lindqvist as alternate signatory for an entity already mapped in the cluster.', c: 'document', tags: ['ownership'], p: 'medium' },
  { t: 'Market data: unusual options flow in shipping index', s: 'Options flow in a major shipping index shows unusual positioning ahead of the quarterly rate reset. No fundamental catalyst identified.', c: 'dataset', tags: ['markets'], p: 'low' },
]

interface ProjectSeed {
  key: string
  name: string
  description: string
  status: 'active' | 'paused' | 'archived' | 'completed'
  priority: Priority
  tags: string[]
  sourceKeys: string[]
  findings: SeedFinding[]
  days: number
}

const PROJECTS_SEED: ProjectSeed[] = [
  {
    key: 'meridian',
    name: 'Meridian Holdings Ownership Network',
    description:
      'Trace beneficial ownership of the Meridian Holdings entity cluster (Cyprus / BVI / Marshall Islands). Suspected layering ahead of a contested procurement award.',
    status: 'active',
    priority: 'critical',
    tags: ['shell-companies', 'ownership', 'finance'],
    sourceKeys: ['edgar', 'opensanctions', 'reuters'],
    findings: MERIDIAN,
    days: 30,
  },
  {
    key: 'rotterdam',
    name: 'Rotterdam Container Diversion',
    description:
      'Document suspected cargo diversion via transshipment corridors out of the Port of Rotterdam, including ship-to-ship transfer indicators.',
    status: 'active',
    priority: 'high',
    tags: ['trade', 'logistics', 'sanctions-evasion'],
    sourceKeys: ['reuters', 'ap', 'ft'],
    findings: ROTTERDAM,
    days: 30,
  },
  {
    key: 'helios',
    name: 'Helios Pharma Supply Chain',
    description:
      'Assess certification and traceability gaps in the Helios pharma procurement chain. Paused pending supplier re-certification responses.',
    status: 'paused',
    priority: 'medium',
    tags: ['pharma', 'supply-chain'],
    sourceKeys: ['ap', 'ft'],
    findings: HELIOS,
    days: 25,
  },
  {
    key: 'riverio',
    name: 'Rio Verde Water Rights Litigation',
    description:
      'Monitor public records and dockets in the Rio Verde basin allocation dispute; track telemetry evidence and connected entities.',
    status: 'active',
    priority: 'medium',
    tags: ['environment', 'litigation'],
    sourceKeys: ['riverio', 'ap'],
    findings: RIVERIO,
    days: 20,
  },
  {
    key: 'lantern',
    name: "Lantern Disinformation Cluster",
    description:
      'Closed monitoring of the Lantern disinformation cluster. Retained for reference; no active collection.',
    status: 'archived',
    priority: 'low',
    tags: ['disinfo', 'osint'],
    sourceKeys: ['ap'],
    findings: LANTERN,
    days: 30,
  },
]

const DAY = 86_400_000
const rand = (min: number, max: number) => min + Math.random() * (max - min)

function statusFor(index: number): 'unread' | 'read' | 'reviewed' {
  const r = index % 3
  return r === 0 ? 'unread' : r === 1 ? 'read' : 'reviewed'
}

export async function seedIfEmpty(): Promise<void> {
  if (!config.seedOnEmpty) return
  const count = await qOne<{ n: number }>('SELECT count(*)::int AS n FROM projects')
  if ((count?.n ?? 0) > 0) return

  console.log('[seed] empty database detected — seeding research world…')
  const client = await (await import('./pool.js')).pool.connect()
  try {
    await client.query('BEGIN')

    // Sources
    const sourceIds: Record<string, string> = {}
    for (const s of SOURCES_SEED) {
      const checkedAgoMin = rand(5, Math.max(6, s.interval * 0.8))
      const row = await client.query(
        `INSERT INTO sources (url, url_key, display_name, category, check_interval_min, enabled, last_checked_at, last_status, notes)
         VALUES ($1,$2,$3,$4,$5,true, now() - make_interval(mins => $6), 'ok', $7) RETURNING id`,
        [s.url, s.url.toLowerCase().replace(/\/+$/, ''), s.name, s.category, s.interval, checkedAgoMin, s.notes],
      )
      sourceIds[s.key] = row.rows[0].id as string
    }

    // Projects + links
    const projectIds: Record<string, string> = {}
    for (const p of PROJECTS_SEED) {
      const row = await client.query(
        `INSERT INTO projects (name, description, status, priority, tags) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [p.name, p.description, p.status, p.priority, p.tags],
      )
      projectIds[p.key] = row.rows[0].id as string
      for (const sk of p.sourceKeys) {
        await client.query('INSERT INTO project_sources (project_id, source_id) VALUES ($1,$2)', [
          projectIds[p.key],
          sourceIds[sk],
        ])
      }
    }

    // Findings (spread across each project's active window)
    const findingIds: Record<string, string[]> = {}
    const activityRows: Array<[string, string, string | null, string | null, string, object, Date]> = []
    const now = Date.now()

    for (const p of PROJECTS_SEED) {
      const ids: string[] = []
      for (let i = 0; i < p.findings.length; i++) {
        const f = p.findings[i]
        // Newest first in the array; spread timestamps across the window.
        const ageDays = rand(0.2, p.days) * (i / Math.max(1, p.findings.length - 1) + 0.35)
        const createdAt = new Date(now - Math.min(ageDays, p.days) * DAY)
        const archived = f.p === 'low' && i % 4 === 2
        const row = await client.query(
          `INSERT INTO findings (title, summary, source_id, project_id, category, confidence, priority, status, archived, tags, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING id`,
          [
            f.t,
            f.s,
            p.sourceKeys.length ? sourceIds[p.sourceKeys[i % p.sourceKeys.length]] : null,
            projectIds[p.key],
            f.c,
            Math.round(rand(0.42, 0.96) * 100) / 100,
            f.p,
            statusFor(i),
            archived,
            f.tags,
            createdAt.toISOString(),
          ],
        )
        const id = row.rows[0].id as string
        ids.push(id)
        // Log a subset of findings in the activity feed (recent ones).
        if (ageDays < 6 && i % 2 === 0) {
          activityRows.push(['finding.created', 'finding', id, projectIds[p.key], `New finding: ${f.t}`, {}, createdAt])
        }
      }
      findingIds[p.key] = ids
    }

    // Unassigned findings (source checks with no monitoring project)
    for (let i = 0; i < UNASSIGNED.length; i++) {
      const f = UNASSIGNED[i]
      const createdAt = new Date(now - rand(0.3, 18) * DAY)
      const row = await client.query(
        `INSERT INTO findings (title, summary, source_id, project_id, category, confidence, priority, status, archived, tags, created_at, updated_at)
         VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,false,$8,$9,$9) RETURNING id`,
        [f.t, f.s, sourceIds['reuters'], f.c, Math.round(rand(0.4, 0.9) * 100) / 100, f.p, statusFor(i), f.tags, createdAt.toISOString()],
      )
      if (i % 2 === 0) {
        activityRows.push(['finding.created', 'finding', row.rows[0].id as string, null, `New finding: ${f.t}`, {}, createdAt])
      }
    }

    // Briefs — reference real seeded finding ids.
    const m = findingIds.meridian
    const r = findingIds.rotterdam
    const meridianBrief = await client.query(
      `INSERT INTO briefs (project_id, title, executive_summary, key_findings, evidence_refs, timeline, open_questions, analyst_notes, conclusions, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'final') RETURNING id`,
      [
        projectIds.meridian,
        'Meridian Holdings — Beneficial Ownership Assessment',
        'Beneficial ownership of the Meridian Holdings entity cluster remains obscured through a nominee network spanning Cyprus, the BVI, and the Marshall Islands. Over the past 30 days, registry extracts, EDGAR disclosures, and sanctions matching have tightened the link between Meridian Holdings Ltd and two shell entities — Kestrel Trading Ltd and Aldermore Capital LLC — that route intercompany flows. The pattern is consistent with layering; a natural-person beneficial owner has not yet been identified.',
        JSON.stringify([
          { id: 'kf1', text: 'A nominee director is shared across Meridian Holdings Ltd, Pelican Point S.A., and two shell entities, indicating common control of the cluster.', finding_ids: [m[1], m[10]] },
          { id: 'kf2', text: 'Intercompany cash flow is routed through Aldermore Capital LLC on a monthly cadence, consistent with layering rather than ordinary commerce.', finding_ids: [m[7], m[0]] },
          { id: 'kf3', text: 'Periodic filings omit or delay disclosure of material counterparties, including Kestrel Trading Ltd above the stated materiality threshold.', finding_ids: [m[11], m[2]] },
        ]),
        JSON.stringify([
          { type: 'finding', id: m[1], label: 'Cypriot registry extract shows shared nominee director' },
          { type: 'finding', id: m[7], label: 'Bank records excerpt shows intercompany transfers via Aldermore Capital' },
          { type: 'source', id: sourceIds.edgar, label: 'SEC EDGAR Filings' },
          { type: 'source', id: sourceIds.opensanctions, label: 'OpenSanctions Registry' },
        ]),
        JSON.stringify([
          { date: isoDaysAgo(29), label: 'Cluster first flagged via client intake', detail: 'Initial entity list: 6 companies across 3 jurisdictions.' },
          { date: isoDaysAgo(21), label: 'Cypriot registry extract obtained', detail: 'Shared nominee director identified.' },
          { date: isoDaysAgo(12), label: 'EDGAR 10-K counterparty disclosure', detail: 'Kestrel Trading Ltd disclosed late; related-party flags raised.' },
          { date: isoDaysAgo(4), label: 'OpenSanctions alias match', detail: 'Moderate-confidence match to a sanctioned individual; verification pending.' },
        ]),
        JSON.stringify([
          'Who is the natural-person beneficial owner behind the nominee network?',
          'Do Aldermore Capital flows terminate at a sanctioned individual or entity?',
          'What is the role of Vantiq Marine SA in the cluster?',
        ]),
        'Registry extract provenance needs verification before external citation. Legal has flagged that the Halvorsen statement should not be characterized as an admission.',
        'The evidence supports treating Kestrel Trading Ltd and Aldermore Capital LLC as part of the Meridian ownership network for reporting purposes. Recommend escalating sanctions screening on the shared nominee and requesting a full registry extract from Cyprus before finalizing the client deliverable.',
      ],
    )

    const rotterdamBrief = await client.query(
      `INSERT INTO briefs (project_id, title, executive_summary, key_findings, evidence_refs, timeline, open_questions, analyst_notes, conclusions, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'','','draft') RETURNING id`,
      [
        projectIds.rotterdam,
        'Rotterdam Diversion — Interim Brief',
        'Interim assessment of the Rotterdam diversion pattern. Transshipment data and vessel tracking support a recurring re-routing corridor, with one confirmed ship-to-ship transfer window overlapping a customs hold release.',
        JSON.stringify([
          { id: 'kf1', text: 'MT Alder Point operated dark (no AIS) for 14 hours in a corridor consistent with ship-to-ship transfers; the window overlaps the release of a customs hold on the same cargo batch.', finding_ids: [r[2], r[9]] },
        ]),
        JSON.stringify([
          { type: 'finding', id: r[2], label: 'AIS gap: MT Alder Point dark for 14 hours near Antwerp' },
          { type: 'source', id: sourceIds.ft, label: 'FT Markets & Corporate' },
        ]),
        JSON.stringify([
          { date: isoDaysAgo(26), label: 'Diversion hypothesis opened', detail: 'Based on container tracking anomalies.' },
          { date: isoDaysAgo(9), label: 'AIS dark-window confirmed', detail: 'Corroborated by commercial imagery.' },
        ]),
        JSON.stringify([
          'Is the unflagged vessel at Piraeus the same hull as MT Alder Point?',
          'What cargo categories are excluded from the re-routing pattern?',
        ]),
      ],
    )

    // Activity feed: creations + brief events, timestamps aligned to entities.
    const briefsFinalized = new Date(now - 3 * DAY)
    activityRows.push(
      ['brief.created', 'brief', meridianBrief.rows[0].id as string, projectIds.meridian, 'Brief created: Meridian Holdings — Beneficial Ownership Assessment', {}, new Date(now - 8 * DAY)],
      ['brief.finalized', 'brief', meridianBrief.rows[0].id as string, projectIds.meridian, 'Brief finalized: Meridian Holdings — Beneficial Ownership Assessment', {}, briefsFinalized],
      ['brief.created', 'brief', rotterdamBrief.rows[0].id as string, projectIds.rotterdam, 'Brief created: Rotterdam Diversion — Interim Brief', {}, new Date(now - 5 * DAY)],
    )
    for (const p of PROJECTS_SEED) {
      activityRows.push(['project.created', 'project', projectIds[p.key], projectIds[p.key], `Project created: ${p.name}`, {}, new Date(now - p.days * DAY)])
    }

    const ordered = activityRows.sort((a, b) => a[6].getTime() - b[6].getTime())
    for (const [type, entityType, entityId, projectId, message, meta, createdAt] of ordered) {
      await client.query(
        `INSERT INTO activity_events (type, entity_type, entity_id, project_id, message, meta, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [type, entityType, entityId, projectId, message, JSON.stringify(meta), createdAt.toISOString()],
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  await recomputeTags().catch(() => undefined)
  console.log('[seed] done — 5 projects, 6 sources, ~47 findings, 2 briefs')
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString().slice(0, 10)
}
