const alertHeader = 'repository\talert_number\tseverity\tecosystem\tpackage\tghsa\tcve\tvulnerable_range\tpatched_version\tscope\trelationship\tmanifest_path\tsummary\thtml_url\tcreated_at'

function alertQuery(repository) {
  return `.[] | ["${repository}", (.number | tostring), .security_advisory.severity, .dependency.package.ecosystem, .dependency.package.name, .security_advisory.ghsa_id, (.security_advisory.cve_id // ""), .security_vulnerability.vulnerable_version_range, (.security_vulnerability.first_patched_version.identifier // ""), (.dependency.scope // ""), (.dependency.relationship // ""), (.dependency.manifest_path // ""), (.security_advisory.summary // ""), .html_url, .created_at] | @tsv`
}

function makeCommand(owner, shell = 'bash') {
  if (shell === 'fish') return makeFishCommand(owner)
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
