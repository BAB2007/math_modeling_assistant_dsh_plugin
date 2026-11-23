// 自检 2：校验技能正文引用的“知识库路径”是否真实存在于 assets/ 内。
// 用法：node scripts/check-links.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const assets = fileURLToPath(new URL('../assets', import.meta.url))
const KB_ROOTS = new Set(['roles', 'tools', 'algorithms', 'references', 'vendor', 'skills'])
const files = []
const router = join(assets, 'SKILL.md')
if (existsSync(router)) files.push(router)
for (const name of readdirSync(join(assets, 'skills'))) {
  const f = join(assets, 'skills', name, 'SKILL.md')
  if (existsSync(f) && statSync(f).isFile()) files.push(f)
}

const tokenRe = /((?:\.{1,2}\/)?(?:[A-Za-z0-9_\u4e00-\u9fa5.\-]+\/)+[A-Za-z0-9_\u4e00-\u9fa5.\-]+\.(?:md|py|m|tex|bib|json|csv|xsd|yaml|yml))/g
let total = 0
const missing = new Map()
const counts = { skills: files.length, refs: 0, checked: 0 }
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const rel = file.slice(assets.length + 1).replace(/\\/g, '/')
  const ownDir = normalize(join(file, '..'))
  for (const m of text.matchAll(tokenRe)) {
    total++
    const raw = m[1]
    const first = raw.replace(/^(\.\.\/)+/, '').split('/')[0]
    if (!KB_ROOTS.has(first) && !(first === 'assets')) continue
    counts.checked++
    const stripped = raw.replace(/^(\.\.\/)+/, '').replace(/^assets\//, '')
    const candidates = [join(assets, stripped), resolve(ownDir, raw), join(assets, raw)]
    if (!candidates.some((c) => existsSync(c))) {
      if (!missing.has(raw)) missing.set(raw, new Set())
      missing.get(raw).add(rel)
    }
  }
}
console.log('技能文件 =', counts.skills, '/ 全部路径引用 =', total, '/ 知识库路径 =', counts.checked)
if (missing.size) {
  console.log('\n未解析的知识库引用:')
  for (const [k, v] of [...missing.entries()].sort()) console.log('  ' + k + '   ← ' + [...v].join(', '))
} else {
  console.log('全部知识库引用均可解析 ✓')
}
process.exit(missing.size ? 1 : 0)