#!/usr/bin/env node
// Audit check for the poker0matic harness: fails on any known vulnerability in the installed npm
// packages, except advisories the user explicitly accepted in .claude/audit-allowlist.json.
//
// - Runs `npm audit --json` and tells "audit could not run" (registry unreachable, bad lockfile)
//   apart from real advisories.
// - Allowlist entries: { "id": "GHSA-xxxx-xxxx-xxxx", "package": "name", "reason": "...",
//   "approvedBy": "who", "expires": "YYYY-MM-DD" }, all required, expiring at most MAX_DAYS from
//   today. Only the user adds entries (never an agent on its own). Accepted advisories are always
//   listed; an expired entry no longer accepts; an invalid file or entry fails the check; entries
//   whose advisory is gone are listed as stale.
//
// Exit 0 when nothing unaccepted is found, 1 otherwise. Messages go to stdout.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

const ALLOWLIST = '.claude/audit-allowlist.json'
const MAX_DAYS = 90
const DATE = /^\d{4}-\d{2}-\d{2}$/

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
process.chdir(root)

let raw
try {
  raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
} catch (error) {
  // npm audit exits non-zero when it finds advisories; the JSON report is still on stdout.
  raw = error.stdout ?? ''
}

let report
try {
  report = JSON.parse(raw)
} catch {
  report = null
}
if (!report || report.error || !report.metadata?.vulnerabilities) {
  const detail = (report?.error?.summary || report?.error?.code || report?.message || 'no JSON report').slice(0, 200)
  console.log(`FAIL: npm audit could not run (${detail}). This is not an advisory: check the registry connection and package-lock.json, then retry.`)
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
const latest = new Date(Date.now() + MAX_DAYS * 86_400_000).toISOString().slice(0, 10)

let allowlist = []
if (existsSync(ALLOWLIST)) {
  try {
    allowlist = JSON.parse(readFileSync(ALLOWLIST, 'utf8'))
  } catch (error) {
    console.log(`FAIL: invalid allowlist ${ALLOWLIST}: ${error.message}`)
    process.exit(1)
  }
  if (!Array.isArray(allowlist)) {
    console.log(`FAIL: invalid allowlist ${ALLOWLIST}: it must be a JSON array of entries.`)
    process.exit(1)
  }
}

const invalid = []
const accepted = new Map()
const expired = new Map()
for (const [index, entry] of allowlist.entries()) {
  const missing = ['id', 'package', 'reason', 'approvedBy', 'expires'].filter(key => typeof entry?.[key] !== 'string' || entry[key].trim() === '')
  if (missing.length > 0) {
    invalid.push(`entry ${index}: missing ${missing.join(', ')}`)
  } else if (!DATE.test(entry.expires)) {
    invalid.push(`entry ${index} (${entry.id}): expires must be YYYY-MM-DD`)
  } else if (entry.expires > latest) {
    invalid.push(`entry ${index} (${entry.id}): expires ${entry.expires} is more than ${MAX_DAYS} days away (latest ${latest})`)
  } else if (entry.expires >= today) {
    accepted.set(entry.id, entry)
  } else {
    expired.set(entry.id, entry)
  }
}
if (invalid.length > 0) {
  console.log(`FAIL: invalid allowlist ${ALLOWLIST} (entries need id, package, reason, approvedBy, expires ≤ ${MAX_DAYS} days):`)
  for (const message of invalid) {
    console.log(`- ${message}`)
  }
  process.exit(1)
}

// One line per advisory (an advisory can be reported through several dependency paths).
const advisories = new Map()
for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via !== 'object' || via == null) {
      continue
    }
    const id = /GHSA-[\w-]+/.exec(via.url ?? '')?.[0] ?? `npm-${via.source}`
    if (!advisories.has(id)) {
      advisories.set(id, { id, package: via.name ?? name, severity: via.severity, title: via.title, range: via.range })
    }
  }
}

const open = [...advisories.values()].filter(advisory => !accepted.has(advisory.id))
const acceptedFound = [...advisories.values()].filter(advisory => accepted.has(advisory.id))
const describe = advisory => `${advisory.id} · ${advisory.package} ${advisory.range ?? ''} · ${advisory.severity} · ${advisory.title ?? ''}`.trim()

for (const [id, entry] of [...accepted, ...expired]) {
  if (!advisories.has(id)) {
    console.log(`STALE: allowlist entry ${id} (${entry.package}) matches no current advisory; remove it.`)
  }
}

for (const advisory of acceptedFound) {
  const entry = accepted.get(advisory.id)
  console.log(`ACCEPTED: ${describe(advisory)} — until ${entry.expires}, approved by ${entry.approvedBy ?? '?'}: ${entry.reason ?? ''}`)
}

if (open.length > 0) {
  console.log(`FAIL: ${open.length} unaccepted advisor${open.length === 1 ? 'y' : 'ies'} (fix with /audit; never 'npm audit fix --force'):`)
  for (const advisory of open) {
    const note = expired.has(advisory.id) ? ` (allowlist entry expired ${expired.get(advisory.id).expires})` : ''
    console.log(`- ${describe(advisory)}${note}`)
  }
  process.exit(1)
}

const counts = report.metadata.vulnerabilities
console.log(`PASS: no unaccepted advisory (npm audit total: ${counts.total ?? 0}, accepted: ${acceptedFound.length}).`)
