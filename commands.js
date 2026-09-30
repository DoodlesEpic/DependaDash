const alertHeader = 'repository\talert_number\tseverity\tecosystem\tpackage\tghsa\tcve\tvulnerable_range\tpatched_version\tscope\trelationship\tmanifest_path\tsummary\thtml_url\tcreated_at'

function alertQuery(repository) {
  return `.[] | ["${repository}", (.number | tostring), .security_advisory.severity, .dependency.package.ecosystem, .dependency.package.name, .security_advisory.ghsa_id, (.security_advisory.cve_id // ""), .security_vulnerability.vulnerable_version_range, (.security_vulnerability.first_patched_version.identifier // ""), (.dependency.scope // ""), (.dependency.relationship // ""), (.dependency.manifest_path // ""), (.security_advisory.summary // ""), .html_url, .created_at] | @tsv`
}

function makeCommand(owner, shell = 'bash') {
  if (shell === 'cmd') return makeCmdCommand(owner)
  if (shell === 'powershell') return makePowerShellCommand(owner)
  if (shell === 'fish') return makeFishCommand(owner)
  if (shell !== 'bash' && shell !== 'zsh') throw new Error('Unsupported shell')
  const output = `dependabot-alerts-${owner}.tsv`

  return `OWNER='${owner}'
OUT='${output}'

{
  printf '${alertHeader.replace(/\t/g, '\\t')}\\n'

  gh repo list "$OWNER" --limit 10000 --json nameWithOwner \\
    --jq '.[].nameWithOwner' |
  while IFS= read -r repo; do
    echo "Reading $repo..." >&2

    gh api --paginate \\
      -H "Accept: application/vnd.github+json" \\
      -H "X-GitHub-Api-Version: 2022-11-28" \\
      "/repos/$repo/dependabot/alerts?state=open&per_page=100" \\
      --jq "${alertQuery('$repo').replace(/"/g, '\\"')}" 2>/dev/null || echo "Cannot read alerts for $repo. Skipping." >&2
  done
} > "$OUT"

echo "Created $OUT"`
}

function makeFishCommand(owner) {
  return `set -l owner '${owner}'
set -l out 'dependabot-alerts-${owner}.tsv'

begin
  printf '${alertHeader.replace(/\t/g, '\\t')}\\n'

  for repo in (gh repo list "$owner" --limit 10000 --json nameWithOwner --jq '.[].nameWithOwner')
    echo "Reading $repo..." >&2
    gh api --paginate \\
      -H "Accept: application/vnd.github+json" \\
      -H "X-GitHub-Api-Version: 2022-11-28" \\
      "/repos/$repo/dependabot/alerts?state=open&per_page=100" \\
      --jq "${alertQuery('$repo').replace(/"/g, '\\"')}" 2>/dev/null
    or echo "Cannot read alerts for $repo. Skipping." >&2
  end
end > "$out"

echo "Created $out"`
}

function makePowerShellCommand(owner) {
  return `$owner = '${owner}'
$out = Join-Path (Get-Location) 'dependabot-alerts-${owner}.tsv'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$previousEncoding = [Console]::OutputEncoding
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8)

try {
  [Console]::OutputEncoding = $utf8
  $writer.WriteLine('${alertHeader}')
  $repos = gh repo list $owner --limit 10000 --json nameWithOwner --jq '.[].nameWithOwner'
  if ($LASTEXITCODE -ne 0) { throw 'Cannot list repositories.' }

  foreach ($repo in $repos) {
    [Console]::Error.WriteLine("Reading $repo...")
    $query = '${alertQuery('REPOSITORY')}'.Replace('REPOSITORY', $repo)
    if ($PSVersionTable.PSVersion -lt [version]'7.3' -or $PSNativeCommandArgumentPassing -eq 'Legacy') {
      $query = $query.Replace('"', '\\"')
    }
    $alerts = gh api --paginate -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "/repos/$repo/dependabot/alerts?state=open&per_page=100" --jq $query 2>$null
    if ($LASTEXITCODE -eq 0) {
      foreach ($alert in $alerts) { $writer.WriteLine($alert) }
    } else {
      [Console]::Error.WriteLine("Cannot read alerts for $repo. Skipping.")
    }
  }
} finally {
  $writer.Dispose()
  [Console]::OutputEncoding = $previousEncoding
}

Write-Output "Created dependabot-alerts-${owner}.tsv"`
}

function makeCmdCommand(owner) {
  return `@echo off
setlocal
set "OWNER=${owner}"
set "OUT=dependabot-alerts-${owner}.tsv"

> "%OUT%" echo ${alertHeader}
for /f "delims=" %%R in ('gh repo list "%OWNER%" --limit 10000 --json nameWithOwner --jq ".[].nameWithOwner"') do (
  echo Reading %%R... 1>&2
  gh api --paginate -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "/repos/%%R/dependabot/alerts?state=open&per_page=100" --jq "${alertQuery('%%R').replace(/"/g, '\\"')}" >> "%OUT%" 2>nul || echo Cannot read alerts for %%R. Skipping. 1>&2
)

echo Created %OUT%
endlocal`
}
