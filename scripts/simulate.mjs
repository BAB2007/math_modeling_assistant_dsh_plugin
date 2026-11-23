// 自检 3：用 mock ctx 驱动真实 apply()，跑通 init → state → phase → todo → gate → skill_read → complete。
// 用法：node scripts/simulate.mjs
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import fsSync from 'node:fs'

const ws = fileURLToPath(new URL('../.sandbox/sim-ws', import.meta.url))
const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))
fsSync.rmSync(ws, { recursive: true, force: true })
fsSync.mkdirSync(ws, { recursive: true })

const norm = (p) => String(p).replace(/\\/g, '/').toLowerCase()
const fsService = {
  async resolve(p) { return { path: resolve(ws, String(p)) } },
  processPath(t) { return t.path },
  async stat(t) {
    try { const st = fsSync.statSync(t.path); return { type: st.isDirectory() ? 'directory' : 'file', size: st.size } }
    catch { return null }
  },
  async readText(t) { return fsSync.readFileSync(t.path, 'utf8') },
  async writeText(t, content) { fsSync.mkdirSync(dirname(t.path), { recursive: true }); fsSync.writeFileSync(t.path, content); return { path: t.path } },
  async listDir(t) { return fsSync.readdirSync(t.path).map((name) => ({ name })) },
  contains(a, b) { const A = norm(a.path), B = norm(b.path); return B.startsWith(A + '/') }
}
const shell = {
  resolve: (req) => req,
  async run(req) {
    const m = /New-Item -ItemType Directory -Force -Path '(.+?)'/i.exec(req.command)
    if (m) fsSync.mkdirSync(m[1], { recursive: true })
    return { exitCode: 0, stdout: '', stderr: '' }
  }
}
const tools = new Map()
const registered = []
const ctx = {
  get(name) {
    const map = {
      fs: fsService,
      shell,
      tools: { register(def) { tools.set(def.name, def); return () => tools.delete(def.name) } },
      skills: { register(skill) { registered.push(skill.name); return () => {} } },
      systemPrompt: { section() { return () => {} } },
      agents: { currentInitiator() { return { session: { header: { cwd: ws } } } } },
      sandboxPolicy: { workspaceRoot: ws }
    }
    return map[name]
  },
  effect(fn) { return fn() },
  on() {}
}

const mod = await import(pathToFileURL(entry).href)
await mod.apply(ctx)

const say = (k, v) => console.log(k.padEnd(22), typeof v === 'string' ? v : JSON.stringify(v))
say('tools', [...tools.keys()].join(' '))
say('skills registered', registered.length + ' -> ' + registered.join(' '))

const call = (name, args = {}) => tools.get(name).execute(args)
const init = await call('mm_project_init', { title: '模拟自测', competition: 'CUMCM', edition: '2026', subproblems: 'q1,q2' })
say('init.ok', init.ok)
say('init.projectRoot', init.project ? init.project.projectRoot : '-')
say('pointer exists', fsSync.existsSync(resolve(ws, '.math-modeling', 'project.json')))
const st = await call('mm_state')
say('state.initialized', st.initialized)
say('state.phase', st.currentPhase)
const enter = await call('mm_phase_enter', { phase: 'modeling' })
say('phase_enter.ok', enter.ok)
say('phase_enter.skillMdRead', enter.skillMdRead)
say('phase_enter.bodyChars', enter.skillMd ? enter.skillMd.length : 0)
const todo = await call('mm_todo', { action: 'list' })
say('todo', todo.done + '/' + todo.total)
const chk = await call('mm_check_deliverables', { phase: 'modeling' })
say('deliverables', chk.overall)
const gate = await call('mm_gate', { gate: 'M1', mode: 'prepare' })
say('gate.prepare.ok', gate.ok !== false)
say('gate.brief.head', String(gate.brief || '').replace(/\s+/g, ' ').slice(0, 70))
const read = await call('mm_skill_read', { path: 'skills/mm-coding/SKILL.md' })
say('skill_read.chars', read.content ? read.content.length : JSON.stringify(read).slice(0, 80))
const bad = await call('mm_skill_read', { path: '../../etc/passwd' })
say('skill_read.escape', bad.ok === false ? 'blocked' : 'LEAKED')
const rec = await call('mm_gate', { gate: 'M1', mode: 'record', receipt: { scope: 'M1', inputSnapshot: {}, status: 'PASS', evidence: ['x'], findings: [], rework: '' } })
say('gate.record.status', rec.status || rec.ok)
const done = await call('mm_complete')
say('complete.blockers', (done.blockers || []).length)