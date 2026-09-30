const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
let args = process.argv.slice(2)
if (args[0] === 'repo') {
  assert.deepEqual(args, ['repo', 'list', 'acme', '--limit', '10000', '--json', 'nameWithOwner', '--jq', '.[].nameWithOwner'])
  args = ['api', `${process.env.MOCK_GH_URL}/repos`, '--jq', '.[].nameWithOwner']
} else {
  assert.equal(args[0], 'api')
  if (process.env.MOCK_MSYS) assert.equal(process.env.MSYS_NO_PATHCONV, '1')
  assert.ok(args.includes('--paginate'))
  assert.equal(args.filter(arg => arg.startsWith('/repos/acme/')).length, 1)
  args = args.map(arg => arg.startsWith('/repos/') ? process.env.MOCK_GH_URL + arg : arg)
}
const result = spawnSync(process.env.REAL_GH, args, { stdio: 'inherit' })
process.exit(result.status ?? 1)
