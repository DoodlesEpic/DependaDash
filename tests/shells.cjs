const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const http = require('node:http')
const { spawn, spawnSync } = require('node:child_process')
const shell = process.argv[2] || 'bash'
const root = path.resolve(__dirname, '..')
const windows = process.platform === 'win32'
const wine = process.env.TEST_WINE === '1'
assert.ok(['bash', 'fish', 'zsh', 'powershell', 'windows-powershell', 'cmd', 'git-bash'].includes(shell), 'Choose a supported shell')
const generatedShell = shell === 'windows-powershell' ? 'powershell' : shell
const realGh = process.env.REAL_GH || process.env.PATH.split(path.delimiter).map(directory => path.join(directory, windows ? 'gh.exe' : 'gh')).find(file => fs.existsSync(file))
assert.ok(realGh, 'Install GitHub CLI before running the tests')
const mockDir = process.env.MOCK_GH_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'dependadash-mock-'))
if (!process.env.MOCK_GH_DIR) {
  if (windows) {
    const build = spawnSync('cl', ['/nologo', path.join(__dirname, 'mock-gh.c'), `/Fe:${path.join(mockDir, 'gh.exe')}`], { cwd: mockDir, encoding: 'utf8' })
    assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}\nRun from a Visual Studio developer prompt`)
  } else {
    fs.writeFileSync(path.join(mockDir, 'gh'), `#!/usr/bin/env node\nrequire(${JSON.stringify(path.join(__dirname, 'mock-gh.cjs'))})\n`, { mode: 0o755 })
  }
}
const context = vm.createContext({})
vm.runInContext(fs.readFileSync(path.join(root, 'commands.js'), 'utf8'), context)
const command = vm.runInContext(`makeCommand('acme', '${generatedShell}')`, context)
const header = 'repository\talert_number\tseverity\tecosystem\tpackage\tghsa\tcve\tvulnerable_range\tpatched_version\tscope\trelationship\tmanifest_path\tsummary\thtml_url\tcreated_at\tpublished_at'
const fixture = {
  number: 42,
  security_advisory: { published_at: '2026-08-20T12:00:00Z', severity: 'high', ghsa_id: 'GHSA-test-0001', cve_id: null, summary: 'Café 日本語\tquote " and \\ slash\nnext line\rreturn' },
  dependency: { package: { ecosystem: 'npm', name: '@acme/example' }, scope: null, relationship: 'direct', manifest_path: 'package-lock.json' },
  security_vulnerability: { vulnerable_version_range: '< 2.0', first_patched_version: null },
  html_url: 'https://github.com/acme/first/security/dependabot/42', created_at: '2026-09-01T00:00:00Z'
}
const escape = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
const row = [ 'acme/first', '42', 'high', 'npm', '@acme/example', 'GHSA-test-0001', '', '< 2.0', '', '', 'direct', 'package-lock.json', fixture.security_advisory.summary, fixture.html_url, fixture.created_at, fixture.security_advisory.published_at ].map(escape).join('\t')
let scenario
let requests
const server = http.createServer((req, res) => {
  requests.push(req.url)
  res.setHeader('Content-Type', 'application/json')
  if (req.url !== '/repos') {
    const endpoint = new URL(req.url, 'http://localhost')
    assert.equal(endpoint.searchParams.get('state'), 'open')
    assert.equal(endpoint.searchParams.get('per_page'), '100')
  }
  if (req.url === '/repos') {
    res.end(JSON.stringify(scenario === 'empty' ? [] : ['first', 'denied', 'last'].map(name => ({ nameWithOwner: `acme/${name}` }))))
  } else if (req.url.includes('/denied/')) {
    res.statusCode = 403
    res.end('{"message":"Forbidden"}')
  } else if (scenario === 'no-alerts') {
    res.end('[]')
  } else if (req.url.includes('/first/') && !req.url.includes('page=2')) {
    assert.equal(req.headers.accept, 'application/vnd.github+json')
    assert.equal(req.headers['x-github-api-version'], '2022-11-28')
    res.setHeader('Link', `<http://127.0.0.1:${server.address().port}${req.url}&page=2>; rel="next"`)
    res.end(JSON.stringify([fixture]))
  } else if (scenario === 'page-error' && req.url.includes('/first/')) {
    res.statusCode = 403
    res.end('{"message":"Forbidden on the second page"}')
  } else if (req.url.includes('/first/')) {
    res.end(JSON.stringify([{ ...fixture, number: 43, security_advisory: { ...fixture.security_advisory, published_at: null } }]))
  } else if (req.url.includes('/last/')) {
    res.end(JSON.stringify([{ ...fixture, number: 44, html_url: fixture.html_url.replace('/first/', '/last/') }]))
  } else {
    res.statusCode = 404
    res.end('{"message":"Unexpected endpoint"}')
  }
})
function execute(file, args, options) {
  return new Promise((resolve, reject) => {
    const stdoutFile = path.join(options.cwd, 'stdout.log')
    const stderrFile = path.join(options.cwd, 'stderr.log')
    const stdoutFd = fs.openSync(stdoutFile, 'w')
    const stderrFd = fs.openSync(stderrFile, 'w')
    const child = spawn(file, args, { ...options, stdio: ['ignore', stdoutFd, stderrFd] })
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`${file} timed out`)) }, 30000)
    fs.closeSync(stdoutFd)
    fs.closeSync(stderrFd)
    child.on('error', reject)
    child.on('close', code => {
      clearTimeout(timeout)
      resolve({ code, stdout: fs.readFileSync(stdoutFile, 'utf8'), stderr: fs.readFileSync(stderrFile, 'utf8') })
    })
    child.on('error', () => clearTimeout(timeout))
  })
}

async function main() {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  for (scenario of ['alerts', 'empty', 'no-alerts', 'page-error']) {
    requests = []
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dependadash space-'))
    try {
      const file = path.join(cwd, generatedShell === 'powershell' ? 'command.ps1' : shell === 'cmd' ? 'command.cmd' : 'command.sh')
      fs.writeFileSync(file, (process.env.PS_LEGACY ? "$PSNativeCommandArgumentPassing = 'Legacy'\n" : '') + command)
      const env = { ...process.env, PATH: `${mockDir}${path.delimiter}${process.env.PATH}`, GH_TOKEN: 'fixture-token', GH_PROMPT_DISABLED: '1', MOCK_MSYS: shell === 'git-bash' ? '1' : '', MOCK_GH_URL: `http://127.0.0.1:${server.address().port}`, REAL_GH: realGh }
      let result
      if (generatedShell === 'powershell') {
        result = await execute(shell === 'windows-powershell' ? 'powershell.exe' : 'pwsh', ['-NoProfile', '-File', file], { cwd, env })
      } else if (shell === 'cmd') {
        result = wine
          ? await execute('wine', ['cmd', '/d', '/c', `Z:${file}`], { cwd, env })
          : await execute(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${file}""`], { cwd, env, windowsVerbatimArguments: true })
      } else if (shell === 'git-bash' && windows) {
        const bash = process.env.GIT_BASH || path.join(process.env.ProgramFiles, 'Git', 'bin', 'bash.exe')
        result = await execute(bash, ['--noprofile', '--norc', file.replace(/\\/g, '/')], { cwd, env })
      } else {
        const runtime = shell === 'git-bash' ? 'bash' : shell === 'zsh' && process.platform === 'darwin' ? '/bin/zsh' : shell
        result = await execute(runtime, [file], { cwd, env })
      }
      assert.equal(result.code, 0, result.stderr)
      const output = fs.readFileSync(path.join(cwd, 'dependabot-alerts-acme.tsv'), 'utf8').replace(/\r\n/g, '\n')
      const lastRow = row.replace('acme/first', 'acme/last').replace('\t42\t', '\t44\t').replace('/first/', '/last/')
      const expected = scenario === 'page-error' ? [header, lastRow, ''].join('\n') : scenario !== 'alerts' ? header + '\n' : [header, row, row.replace('\t42\t', '\t43\t').replace(fixture.security_advisory.published_at, ''), lastRow, ''].join('\n')
      assert.equal(output, expected)
      assert.ok(result.stdout.includes('Created dependabot-alerts-acme.tsv'), result.stdout)
      if (scenario === 'alerts' || scenario === 'page-error') {
        if (scenario === 'page-error') assert.ok(result.stderr.includes('Cannot read alerts for acme/first. Skipping.'), result.stderr)
        assert.ok(result.stderr.includes('Cannot read alerts for acme/denied. Skipping.'), result.stderr)
        assert.equal(requests.length, 5)
      } else if (scenario === 'empty') {
        assert.deepEqual(requests, ['/repos'])
      } else {
        assert.equal(requests.length, 4)
        assert.ok(result.stderr.includes('Cannot read alerts for acme/denied. Skipping.'), result.stderr)
      }
      console.log(`${shell}: ${scenario} passed`)
    } finally { fs.rmSync(cwd, { recursive: true, force: true }) }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  server.close()
  if (!process.env.MOCK_GH_DIR) fs.rmSync(mockDir, { recursive: true, force: true })
})
