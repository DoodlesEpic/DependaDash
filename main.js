const $ = selector => document.querySelector(selector)
const $$ = selector => [...document.querySelectorAll(selector)]

const shellsByOS = {
  linux: ['bash', 'fish', 'zsh', 'powershell'],
  macos: ['zsh', 'bash', 'fish', 'powershell'],
  windows: ['powershell', 'cmd', 'git-bash']
}
const shellNames = { bash: 'Bash', fish: 'fish', zsh: 'Zsh', powershell: 'PowerShell', cmd: 'Windows Command Prompt', 'git-bash': 'Git Bash' }

const severityRank = { critical: 0, high: 1, medium: 2, low: 3 }
let rows = []
let filtered = []
let loadedOwnerHint = ''

const elements = {
  owner: $('#ownerInput'),
  ownerStatus: $('#ownerStatus'),
  os: $('#osSelect'),
  shell: $('#shellSelect'),
  shellHint: $('#shellHint'),
  command: $('#command'),
  copy: $('#copyBtn'),
  dashboard: $('#dashboard'),
  setup: $('#setup'),
  body: $('#alertsBody'),
  alertsEmpty: $('#alertsEmpty'),
  advisoriesList: $('#advisoriesList'),
  advisoriesEmpty: $('#advisoriesEmpty'),
  search: $('#search'),
  severity: $('#severityFilter'),
  repo: $('#repoFilter'),
  ecosystem: $('#ecosystemFilter'),
  total: $('#totalCount'),
  critical: $('#criticalCount'),
  high: $('#highCount'),
  medium: $('#mediumCount'),
  low: $('#lowCount'),
  meta: $('#resultMeta'),
  fileMeta: $('#fileMeta'),
  reset: $('#resetBtn'),
  export: $('#exportBtn'),
  alertsView: $('#alertsView'),
  advisoriesView: $('#advisoriesView'),
  loadedOwner: $('#loadedOwner'),
  loadedRepos: $('#loadedRepos')
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function isValidOwner(owner) {
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner) && !owner.includes('--')
}

function safeSlug(value) {
  return (value || 'github').replace(/[^A-Za-z0-9._-]+/g, '-')
}

function updateShells() {
  elements.shell.innerHTML = shellsByOS[elements.os.value]
    .map(shell => `<option value="${shell}">${shellNames[shell]}</option>`)
    .join('')
  updateOwner()
}

function updateOwner() {
  elements.shellHint.hidden = elements.shell.value !== 'cmd'
  const owner = elements.owner.value.trim()

  if (!owner) {
    elements.ownerStatus.textContent = 'Enter a GitHub owner to generate the command.'
    elements.ownerStatus.className = 'owner-status'
    elements.command.textContent = '# Enter a GitHub owner above.'
    elements.copy.disabled = true
    return
  }

  if (!isValidOwner(owner)) {
    elements.ownerStatus.textContent = 'Invalid owner name. Use letters, numbers, and hyphens in a valid GitHub owner name.'
    elements.ownerStatus.className = 'owner-status bad'
    elements.command.textContent = '# Fix the owner name to generate the command.'
    elements.copy.disabled = true
    return
  }

  elements.ownerStatus.textContent = `Ready to scan repositories owned by ${owner}.`
  elements.ownerStatus.className = 'owner-status good'
  elements.command.textContent = makeCommand(owner, elements.shell.value)
  elements.copy.disabled = false
}

function tsvUnescape(value = '') {
  return value
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\')
}

function toast(message) {
  const toastElement = $('#toast')
  toastElement.textContent = message
  toastElement.classList.add('show')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => toastElement.classList.remove('show'), 1800)
}

function parseTSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '')
  if (!lines.length) return []

  const header = lines[0].split('\t').map(value => value.trim())
  const required = ['repository', 'severity', 'package', 'ghsa', 'html_url']
  const missing = required.filter(column => !header.includes(column))

  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`)

  return lines.slice(1).map((line, index) => {
    const values = line.split('\t').map(tsvUnescape)
    const row = { _line: index + 2 }

    header.forEach((column, columnIndex) => {
      row[column] = values[columnIndex] ?? ''
    })

    row.severity = (row.severity || '').toLowerCase()
    return row
  }).filter(row => row.repository || row.package || row.ghsa)
}

function ownerFromFilename(filename = '') {
  const match = filename.match(/^dependabot-alerts-(.+)\.tsv$/i)
  return match ? match[1] : ''
}

function inferOwner(data) {
  const owners = [...new Set(data.map(row => (row.repository || '').split('/')[0]).filter(Boolean))]
  if (owners.length === 1) return owners[0]
  if (owners.length > 1) return 'multiple owners'
  return loadedOwnerHint || 'unknown'
}

function unique(field) {
  return [...new Set(rows.map(row => row[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function fillSelect(element, values, label) {
  element.innerHTML = `<option value="">${label}</option>` + values
    .map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join('')
}

function updateFilters() {
  const current = {
    severity: elements.severity.value,
    repo: elements.repo.value,
    ecosystem: elements.ecosystem.value
  }

  const severities = unique('severity').sort((a, b) => (severityRank[a] ?? 99) - (severityRank[b] ?? 99))
  fillSelect(elements.severity, severities, 'All severities')
  fillSelect(elements.repo, unique('repository'), 'All repositories')
  fillSelect(elements.ecosystem, unique('ecosystem'), 'All ecosystems')

  elements.severity.value = current.severity
  elements.repo.value = current.repo
  elements.ecosystem.value = current.ecosystem
}

function updateCards() {
  const count = severity => rows.filter(row => row.severity === severity).length
  const repositoryCount = new Set(rows.map(row => row.repository).filter(Boolean)).size
  const owner = inferOwner(rows)

  elements.total.textContent = rows.length
  elements.critical.textContent = count('critical')
  elements.high.textContent = count('high')
  elements.medium.textContent = count('medium')
  elements.low.textContent = count('low')
  elements.loadedOwner.textContent = owner
  elements.loadedRepos.textContent = `${repositoryCount} affected repositor${repositoryCount === 1 ? 'y' : 'ies'}`
}

function render() {
  const query = elements.search.value.trim().toLowerCase()

  filtered = rows.filter(row => {
    if (elements.severity.value && row.severity !== elements.severity.value) return false
    if (elements.repo.value && row.repository !== elements.repo.value) return false
    if (elements.ecosystem.value && row.ecosystem !== elements.ecosystem.value) return false

    if (query) {
      const searchable = [
        row.repository,
        row.package,
        row.ghsa,
        row.cve,
        row.summary,
        row.ecosystem,
        row.manifest_path
      ].join(' ').toLowerCase()

      if (!searchable.includes(query)) return false
    }

    return true
  }).sort((a, b) =>
    (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99) ||
    a.repository.localeCompare(b.repository) ||
    a.package.localeCompare(b.package)
  )

  renderAlerts()
  renderAdvisories()
  elements.meta.textContent = `${filtered.length} of ${rows.length} alert${rows.length === 1 ? '' : 's'}`
}

function renderAlerts() {
  elements.body.innerHTML = filtered.map(row => {
    const advisory = [row.ghsa, row.cve].filter(Boolean).join(' · ')
    const fix = row.patched_version
      ? `<span class="fix">${escapeHtml(row.patched_version)}</span>`
      : '<span class="no-fix">no fix</span>'
    const alertLink = row.html_url
      ? `<a href="${escapeHtml(row.html_url)}" target="_blank" rel="noopener">#${escapeHtml(row.alert_number || '↗')}</a>`
      : '-'
    const advisoryLink = row.ghsa
      ? `<a href="https://github.com/advisories/${encodeURIComponent(row.ghsa)}" target="_blank" rel="noopener">${escapeHtml(advisory)}</a>`
      : escapeHtml(advisory || '-')

    return `<tr>
      <td><span class="badge ${escapeHtml(row.severity)}">${escapeHtml(row.severity || '-')}</span></td>
      <td><span class="repo">${escapeHtml(row.repository)}</span><div class="tiny">${escapeHtml(row.manifest_path || '')}</div></td>
      <td><span class="pkg">${escapeHtml(row.package)}</span><div class="tiny">${escapeHtml(row.ecosystem || '')}</div></td>
      <td>${advisoryLink}</td>
      <td><span class="tiny">${escapeHtml(row.vulnerable_range || '-')}</span></td>
      <td>${fix}</td>
      <td><span class="tiny">${escapeHtml([row.scope, row.relationship].filter(Boolean).join(' · ') || '-')}</span></td>
      <td><div class="summary">${escapeHtml(row.summary || '-')}</div></td>
      <td>${alertLink}</td>
    </tr>`
  }).join('')

  elements.alertsEmpty.hidden = filtered.length > 0
}

function renderAdvisories() {
  const groups = new Map()

  filtered.forEach(row => {
    const key = row.ghsa || row.cve || `${row.package}:${row.summary}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  const items = [...groups.entries()].sort((a, b) => {
    const aSeverity = Math.min(...a[1].map(row => severityRank[row.severity] ?? 99))
    const bSeverity = Math.min(...b[1].map(row => severityRank[row.severity] ?? 99))
    return aSeverity - bSeverity || b[1].length - a[1].length
  })

  elements.advisoriesList.innerHTML = items.map(([key, group]) => {
    const first = group[0]
    const repositories = [...new Set(group.map(row => row.repository))].sort()
    const packages = [...new Set(group.map(row => row.package))].sort()
    const keyHtml = first.ghsa
      ? `<a href="https://github.com/advisories/${encodeURIComponent(first.ghsa)}" target="_blank" rel="noopener">${escapeHtml(key)}</a>`
      : escapeHtml(key)

    return `<div class="advisory">
      <div><span class="badge ${escapeHtml(first.severity)}">${escapeHtml(first.severity)}</span></div>
      <div>
        <h3>${keyHtml} · ${escapeHtml(packages.join(', '))}</h3>
        <div class="muted">${escapeHtml(first.summary || '')}</div>
        <div class="repo-chips">${repositories.map(repository => `<span class="chip">${escapeHtml(repository)}</span>`).join('')}</div>
      </div>
      <div class="count">${group.length}<small>alert${group.length === 1 ? '' : 's'} in ${repositories.length} repo${repositories.length === 1 ? '' : 's'}</small></div>
    </div>`
  }).join('')

  elements.advisoriesEmpty.hidden = items.length > 0
}

function loadData(data, label, ownerHint = '') {
  rows = data
  loadedOwnerHint = ownerHint
  elements.setup.hidden = true
  elements.dashboard.classList.add('visible')
  elements.reset.disabled = false
  elements.fileMeta.textContent = `${label} · ${rows.length} alert${rows.length === 1 ? '' : 's'}`
  updateFilters()
  updateCards()
  render()

  const owner = inferOwner(rows)
  if (owner && owner !== 'multiple owners' && owner !== 'unknown') {
    elements.owner.value = owner
    updateOwner()
  }

  elements.dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function handleFile(file) {
  if (!file) return

  try {
    const text = await file.text()
    const data = parseTSV(text)
    loadData(data, file.name, ownerFromFilename(file.name))
    toast('File loaded')
  } catch (error) {
    window.alert(`Could not read the TSV.\n\n${error.message}`)
  }
}

function exportCsv() {
  const columns = [
    'repository',
    'alert_number',
    'severity',
    'ecosystem',
    'package',
    'ghsa',
    'cve',
    'vulnerable_range',
    'patched_version',
    'scope',
    'relationship',
    'manifest_path',
    'summary',
    'html_url',
    'created_at'
  ]
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [columns.join(','), ...filtered.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')

  link.href = URL.createObjectURL(blob)
  link.download = `dependabot-alerts-${safeSlug(inferOwner(rows))}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
  toast('CSV exported')
}

function loadDemo() {
  const demo = [
    { repository: 'acme/api', alert_number: '12', severity: 'critical', ecosystem: 'npm', package: 'example-lib', ghsa: 'GHSA-demo-0001', cve: 'CVE-2026-DEMO1', vulnerable_range: '< 4.2.1', patched_version: '4.2.1', scope: 'runtime', relationship: 'direct', manifest_path: 'package-lock.json', summary: 'Fictional data used to demonstrate the interface.', html_url: '#', created_at: '2026-09-10T12:00:00Z' },
    { repository: 'acme/web', alert_number: '7', severity: 'high', ecosystem: 'npm', package: 'sample-http', ghsa: 'GHSA-demo-0002', cve: 'CVE-2026-DEMO2', vulnerable_range: '>= 2.0, < 2.4.8', patched_version: '2.4.8', scope: 'runtime', relationship: 'transitive', manifest_path: 'package-lock.json', summary: 'Fictional transitive dependency vulnerability.', html_url: '#', created_at: '2026-09-09T11:00:00Z' },
    { repository: 'acme/worker', alert_number: '3', severity: 'high', ecosystem: 'pip', package: 'sample-http', ghsa: 'GHSA-demo-0002', cve: 'CVE-2026-DEMO2', vulnerable_range: '< 2.4.8', patched_version: '2.4.8', scope: 'runtime', relationship: 'direct', manifest_path: 'requirements.txt', summary: 'The same fictional advisory affecting another repository.', html_url: '#', created_at: '2026-09-09T11:00:00Z' },
    { repository: 'acme/tooling', alert_number: '2', severity: 'medium', ecosystem: 'npm', package: 'demo-parser', ghsa: 'GHSA-demo-0003', cve: '', vulnerable_range: '<= 1.8.0', patched_version: '', scope: 'development', relationship: 'direct', manifest_path: 'package-lock.json', summary: 'Fictional example without a published fix.', html_url: '#', created_at: '2026-09-08T10:00:00Z' },
    { repository: 'acme/site', alert_number: '1', severity: 'low', ecosystem: 'github-actions', package: 'actions/example', ghsa: 'GHSA-demo-0004', cve: '', vulnerable_range: '< 3.0.0', patched_version: '3.0.0', scope: '', relationship: 'direct', manifest_path: '.github/workflows/ci.yml', summary: 'Fictional low severity example.', html_url: '#', created_at: '2026-09-07T10:00:00Z' }
  ]

  loadData(demo, 'Demo data', 'acme')
  toast('Demo loaded')
}

elements.owner.addEventListener('input', updateOwner)
elements.os.addEventListener('change', updateShells)
elements.shell.addEventListener('change', updateOwner)
$('#fileInput').addEventListener('change', event => handleFile(event.target.files[0]))

const dropZone = $('#dropZone')
for (const eventName of ['dragenter', 'dragover']) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault()
    dropZone.classList.add('drag')
  })
}
for (const eventName of ['dragleave', 'drop']) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault()
    dropZone.classList.remove('drag')
  })
}
dropZone.addEventListener('drop', event => handleFile(event.dataTransfer.files[0]))

for (const element of [elements.search, elements.severity, elements.repo, elements.ecosystem]) {
  element.addEventListener(element.tagName === 'INPUT' ? 'input' : 'change', render)
}

for (const tab of $$('.tab')) {
  tab.addEventListener('click', () => {
    for (const candidate of $$('.tab')) {
      candidate.classList.remove('active')
      candidate.setAttribute('aria-selected', 'false')
    }

    tab.classList.add('active')
    tab.setAttribute('aria-selected', 'true')
    const activeTab = tab.dataset.tab
    elements.alertsView.hidden = activeTab !== 'alerts'
    elements.advisoriesView.hidden = activeTab !== 'advisories'
  })
}

elements.copy.addEventListener('click', async () => {
  const command = elements.command.textContent

  try {
    await navigator.clipboard.writeText(command)
    toast('Command copied')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = command
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
    toast('Command copied')
  }
})

elements.reset.addEventListener('click', () => {
  rows = []
  filtered = []
  loadedOwnerHint = ''
  elements.dashboard.classList.remove('visible')
  elements.setup.hidden = false
  elements.fileMeta.textContent = ''
  $('#fileInput').value = ''
  elements.reset.disabled = true
  elements.search.value = ''
  elements.owner.focus()
  toast('Ready to analyze another account')
})

elements.export.addEventListener('click', exportCsv)
$('#demoBtn').addEventListener('click', loadDemo)

updateShells()
