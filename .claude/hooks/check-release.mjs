#!/usr/bin/env node
// Release check for the /deliver harness: every change to the app must bump the version and
// document it in CHANGELOG.md, since every merge to main is deployed.
//
// Changed files are taken from the merge base of HEAD and origin/main (or main), including
// uncommitted and untracked files. When the change touches the app (see APP_PATHS), it requires:
//   - package.json "version" to be the next patch, minor or major of the version on main's tip
//     (so a branch takes the next version again when main moved ahead);
//   - package-lock.json "version" and packages[""].version equal to it;
//   - CHANGELOG.md whose first "## [x.y.z] — YYYY-MM-DD" heading is that version, with at least
//     one "- " entry, and no such heading on main's tip.
// Changes limited to the harness (.claude/), docs or CI pass without a bump.
//
// Exit 0 when the check passes or does not apply, 1 otherwise (including when no merge base with
// main can be found). Messages go to stdout.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

const APP_PATHS = [
  /^src\//,
  /^public\//,
  /^index\.html$/,
  /^vite\.config\./,
  /^tsconfig.*\.json$/,
  /^[^/]+\.d\.ts$/,
  /^package(-lock)?\.json$/,
]
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

function git (...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function tryGit (...args) {
  try {
    return git(...args)
  } catch {
    return null
  }
}

function parseVersion (version) {
  const match = SEMVER.exec(version ?? '')
  return match ? match.slice(1).map(Number) : null
}

function nextVersions ([major, minor, patch]) {
  return [`${major}.${minor}.${patch + 1}`, `${major}.${minor + 1}.0`, `${major + 1}.0.0`]
}

function escapeRegExp (text) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

const root = tryGit('rev-parse', '--show-toplevel')
if (!root) {
  console.log('FAIL: not inside a git repository.')
  process.exit(1)
}
process.chdir(root)

let baseRef = null
let base = null
for (const ref of ['origin/main', 'main']) {
  if (tryGit('rev-parse', '--verify', '--quiet', ref) == null) {
    continue
  }
  base = tryGit('merge-base', 'HEAD', ref)
  if (base) {
    baseRef = ref
    break
  }
}
if (!base) {
  console.log('FAIL: no merge base between HEAD and origin/main or main, so the release check cannot tell what changed.')
  console.log('- Fetch main first, e.g. `git fetch --depth=50 origin main:refs/remotes/origin/main`; in a shallow clone also deepen the branch (`git fetch --deepen=50`).')
  process.exit(1)
}

const changed = new Set([
  // --no-renames: a file moved out of the app still counts as an app change (its old path).
  ...git('diff', '--name-only', '--no-renames', base).split('\n'),
  ...git('ls-files', '--others', '--exclude-standard', '--full-name').split('\n'),
].filter(Boolean))

const appFiles = [...changed].filter(file => APP_PATHS.some(re => re.test(file)))
if (appFiles.length === 0) {
  console.log(`PASS: no app change since ${baseRef} (${changed.size} file(s) changed outside the app), no version bump needed.`)
  process.exit(0)
}

const failures = []
const fail = message => failures.push(message)

// Compare with main's tip, not the merge base: if main shipped a version since the branch
// started, the branch must take the next one.
const tipVersionRaw = JSON.parse(git('show', `${baseRef}:package.json`)).version
const tipVersion = parseVersion(tipVersionRaw)
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const version = pkg.version

if (!tipVersion) {
  fail(`package.json version "${tipVersionRaw}" on ${baseRef} is not x.y.z, so the next version can't be checked.`)
}
if (!parseVersion(version)) {
  fail(`package.json version "${version}" is not x.y.z.`)
} else if (tipVersion && !nextVersions(tipVersion).includes(version)) {
  fail(`package.json version ${version} must be the next version after ${tipVersionRaw} on ${baseRef} (${nextVersions(tipVersion).join(' / ')}; feat → minor, fix → patch, breaking → major): use \`npm version <x.y.z> --no-git-tag-version\`.`)
}

if (lock.version !== version || lock.packages?.['']?.version !== version) {
  fail(`package-lock.json version (${lock.version} / ${lock.packages?.['']?.version}) must equal ${version}: use \`npm version <x.y.z> --no-git-tag-version\`.`)
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
const headings = [...changelog.matchAll(/^## \[([^\]]+)\](.*)$/gm)]
const first = headings[0]
if (!first || first[1] !== version) {
  fail(`CHANGELOG.md must start with a "## [${version}] — YYYY-MM-DD" section (first section is ${first ? `[${first[1]}]` : 'missing'}).`)
} else {
  if (!/^ — \d{4}-\d{2}-\d{2}\s*$/.test(first[2])) {
    fail(`CHANGELOG.md heading for ${version} must be "## [${version}] — YYYY-MM-DD".`)
  }
  const body = changelog.slice(first.index + first[0].length, headings[1]?.index ?? changelog.length)
  if (!/^- /m.test(body)) {
    fail(`CHANGELOG.md section ${version} has no "- " entry.`)
  }
  const tipChangelog = tryGit('show', `${baseRef}:CHANGELOG.md`) ?? ''
  if (new RegExp(String.raw`^## \[${escapeRegExp(version)}\]`, 'm').test(tipChangelog)) {
    fail(`CHANGELOG.md section ${version} already exists on ${baseRef}: take the next version instead of editing a released one.`)
  }
}

if (failures.length > 0) {
  const shown = appFiles.slice(0, 5).join(', ') + (appFiles.length > 5 ? ', …' : '')
  console.log(`FAIL: app files changed since ${baseRef} (${shown}).`)
  for (const message of failures) {
    console.log(`- ${message}`)
  }
  process.exit(1)
}

console.log(`PASS: version ${tipVersionRaw} (${baseRef}) → ${version}, CHANGELOG.md documents it.`)
