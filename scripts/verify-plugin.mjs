// 自检 1：导入插件模块，校验导出与技能发现（frontmatter 解析）是否正常。
// 用法：node scripts/verify-plugin.mjs    （在仓库任意位置均可执行）
import { pathToFileURL, fileURLToPath } from 'node:url'

const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))
const mod = await import(pathToFileURL(entry).href)

console.log('export name =', mod.name)
console.log('has apply   =', typeof mod.apply === 'function')

const found = mod.discoverSkills()
if (!found.length) {
  console.error('FAIL: discoverSkills() 返回空')
  process.exit(1)
}
let bad = 0
for (const s of found) {
  const okName = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name)
  const okDesc = !!s.description
  const okBody = s.content.length > 200
  if (!okName || !okDesc || !okBody) bad++
  console.log(
    (okName && okDesc && okBody ? 'OK  ' : 'BAD ') +
    s.name.padEnd(14) +
    String(s.content.length).padStart(7) + ' chars  ' +
    'desc=' + (s.description || '').slice(0, 46)
  )
}
console.log('total =', found.length, 'bad =', bad)
process.exit(bad === 0 ? 0 : 1)