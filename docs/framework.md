# 框架详解

本文说明插件的运行机制：它如何被宿主加载、如何注册技能与工具、状态机怎么记账、路径怎么解析、坏了怎么降级。使用方法见 [usage.md](./usage.md)。

## 1. 加载链路

```text
profile/package.json:dsh.profile.bundles 含 "dsh-math-modeling"
  → 读该包 package.json 的 dsh.bundle.patch
  → 解析 cordis.patch.yml:
        - insert:
            - id: math-modeling
              name: dsh-math-modeling
  → 宿主加载模块 lib/index.js
  → 调用 apply(ctx)
```

`apply(ctx)` 做四件事，顺序固定：

1. `registerBundledSkills(ctx)` —— 解析 `assets/` 下的 `SKILL.md` 与 `skills/*/SKILL.md`，逐个 `skills.register(...)`。
2. 取 `fs` / `shell` 服务；任一缺失则打印一行说明并 `return`（技能仍可用，`mm_*` 工具不注册）。
3. 注册 9 个 `mm_*` 工具（`tools.register(...)`）。
4. 注册系统提示段（`systemPrompt.section({ name, order: 5000, text })`）。

所有注册都包在 `ctx.effect(() => ...)` 里，返回的 disposer 让插件的技能/工具/提示段随插件卸载一起注销 —— 这就是热插拔能干净生效的原因。

单文件实现、零运行时依赖（只 `peerDependencies` 声明 `@deepseek-ai/cordis`），因此进程内加载不需要 `node_modules`。

## 2. 技能层

| 环节 | 实现 |
|---|---|
| 发现 | 扫描 `assets/SKILL.md`（路由技能）与 `assets/skills/<name>/SKILL.md`（子技能），共 10 个 |
| 元数据 | 只解析 YAML frontmatter 的三个字段：`name`（必填，kebab-case）、`description`、`whenToUse`；支持块标量（`>` / `|`） |
| 正文 | frontmatter 之后的全文，作为 `content` 交给 `skills.register` |
| 资源根 | `resourceBase: { kind: 'directory', path: '<包内 assets 绝对路径>' }`，由 `import.meta.url` 推导 |
| 引用约定 | 技能正文里的资料路径全部相对 `assets/`，例如 `algorithms/03-优化类模型.md`、`roles/建模手/references/...`、`vendor/nature/nature-figure/SKILL.md` |

`discoverSkills()` 是导出的纯函数（供 `scripts/verify-plugin.mjs` 使用），不依赖 Harness。

**只读约束**：`SKILL_ROOT` 永不写入。`mm_skill_read` 读路径先 `fs.resolve` 再用 `fs.contains(SKILL_ROOT, target)` 校验，`../` 越界直接返回 `{ ok: false }`。

## 3. 工具层

九个工具共享同一套内部原语：

| 原语 | 作用 |
|---|---|
| `workspaceRoot()` | 依次尝试 `agents.currentInitiator().session.header.cwd` → `sandboxPolicy.workspaceRoot` → `fs.resolve('.')`，作为默认项目目录的父目录 |
| `loadState(root)` / `persist()` | 从 `PROJECT_ROOT/.math-modeling/state.json` 读/写状态；缺失时用 `freshState()` |
| `writeFile` | `fs.writeText(target, content, …, { mode: 'workspace-write', workspaceRoot: root })` |
| `ensureDir(dir, marker)` | 目录不存在时先试 shell `New-Item`，再兜底写一个 `.keep` 占位文件（`writeText` 的原子写内部会 `mkdir -p`） |
| `runShell(cmd, cwd, timeout)` | `shell.run(shell.resolve({...}))`，用于 `python --version` 之类的探测 |

工具返回值是普通对象，渲染由 `output.render` 统一处理：含 `progress` 字段时输出人类可读看板（项目头 + 阶段 + 门禁 + 任务 + 下一动作 + 账本尾），否则回退到通用 JSON/字段打印。

### 3.1 参数与返回速览

| 工具 | 必填 | 主要返回 |
|---|---|---|
| `mm_project_init` | — | `{ ok, resumed?, notice, …summaryOf() }`（`summaryOf()` = 项目/阶段/门禁/看板/账本尾）；`PROJECT_ROOT` 不存在时自动创建 |
| `mm_state` | — | `{ initialized, currentPhase, project, phases, gates, progress, deliverables, ledgerTail }` |
| `mm_phase_enter` | `phase` | `{ ok, phase, label, skillMdPath, skillMdRead, skillMd, readError, tasks, gates, deliverables }`；前置门禁未过返回 `{ ok: false, error }` |
| `mm_skill_read` | `path` | `{ ok, path, resolved, content }` |
| `mm_gate` | `gate` | `prepare` → `{ ok, brief, snapshot, recordInstruction }`；`record` → `{ ok, status, at, prevStatus, phase, after }` |
| `mm_check_deliverables` | — | `{ ok, phase, overall: 'ok'|'missing'|'blocked', items[] }` |
| `mm_complete` | — | `{ ok, done, blockers[], gates, deliverableChecks, drift[], report }` |
| `mm_log` | `event` | `{ ok, event }` |
| `mm_todo` | `action` | `{ ok, phase, action, total, done, pct, tasks }` |

## 4. 状态机

```text
        mm_project_init
               │
        ┌──────▼──────┐  M1 PASS   ┌─────────────┐  P1 PASS   ┌─────────────┐  P2 PASS
        │  modeling   ├───────────►│ programming ├───────────►│ programming ├──────────► …
        │  (建模手)    │            │  P1 最小可运行 │           │  P2 编程终检 │
        └─────────────┘            └─────────────┘            └─────────────┘
                                          │ W1 PASS (进论文后)          │
                                          ▼                            ▼
                                    ┌──────────┐  W2 PASS   ┌──────────────┐
                                    │  paper   ├───────────►│  mm_complete │
                                    │ (论文手)  │            │  完成判定     │
                                    └──────────┘            └──────────────┘
```

- 阶段顺序固定：`modeling → programming → paper`。
- `programming` 需要 M1 PASS；`paper` 需要 P2 PASS；`mm_gate` 对每个门禁再校验其直接前置。
- 门禁链：`M1 ← P1 ← P2 ← W1 ← W2`（`GATE_PREREQ`）。

### 4.1 state.json

```jsonc
{
  "version": 6,
  "initializedAt": "2026-11-23T04:20:11.880Z",
  "project": {
    "title": "…", "competition": "CUMCM", "edition": "2026",
    "subproblems": ["q1", "q2", "q3"],
    "paperFormat": "word",            // 或 "word+latex"
    "optionalCollab": [],             // rulesCheck / attachmentInventory / literature / …
    "skillRoot": "…/assets",          // 只读
    "projectRoot": "…/math-modeling-project"
  },
  "currentPhase": "modeling",
  "phases": {
    "modeling":    { "enteredAt": "…", "skillMdRead": true, "skillMdPath": "skills/mm-modeling/SKILL.md",
                     "gateM1": { "status": "pass", "at": "…", "artifactVersions": {…}, "receipt": {…} },
                     "tasks": [{ "text": "…", "done": false }] },
    "programming": { "enteredAt": null, "skillMdRead": false, "gateP1": null, "gateP2": null, "tasks": [] },
    "paper":       { "enteredAt": null, "skillMdRead": false, "gateW1": null, "gateW2": null, "tasks": [] }
  },
  "deliverables": { "at": "…", "phase": "modeling", "overall": "missing", "items": [ … ] },
  "completed": false,
  "completedAt": null,
  "ledger": [{ "at": "…", "event": "gate_record", "detail": { "gate": "M1", "status": "pass" } }]
}
```

- `ledger` 上限 500 条，超出丢弃最早记录。
- 账本事件：`init` / `phase_enter` / `skill_md_read` / `skill_read` / `gate_record` / `todo_check` / `deliverables` / `complete` / `log`（自定义事件走 `mm_log`）。
- 状态文件只由插件读写；人类可读但字段语义归插件所有。

### 4.2 门禁回执契约

`mm_gate mode=record` 的 `receipt` 必须包含六个字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `scope` | string | 本次检查覆盖的门禁与未覆盖内容 |
| `inputSnapshot` | string | 路径 / 版本 / SHA-256 |
| `status` | `PASS` \| `FAIL` \| `BLOCKED` | 判定 |
| `evidence` | string[] | 来源 URL / 命令 + 退出码 / 文件位置 + 页码 / 关键数值 |
| `findings` | `{ level: 'P0'\|'P1'\|'P2', text }[]` | 问题清单 |
| `rework` | string | 回到哪个角色、必须改什么、从哪复验 |

判据：有未解决 P0/P1 只能 `FAIL`；缺依赖/权限/输入或可验证证据只能 `BLOCKED`；`PASS` 且 `evidence` 为空会被拒收。记录时以最后一次为准（可反复 record，`prevStatus` 会回报上一次状态）。

### 4.3 漂移检测

`record` 时顺带快照该阶段产物：

| 阶段 | 快照对象 |
|---|---|
| modeling | `题目分析报告.md`、`术语表格.md` |
| programming | `PROJECT_ROOT` 下非隐藏文件 + `results/*` + `figures/*` |
| paper | `完整论文.docx`、`完整论文.conversion.json`、`完整论文-LaTeX/main.tex`、`完整论文.pdf`、`完整论文.build.json` |

`mm_complete` 重新取快照比对：门禁 PASS 之后被改过的文件会作为 `drift` 列出，完成判定直接不成立 —— 想"过了门禁再偷偷改结果"是走不通的。

## 5. 交付物判定规则

| 阶段 | 规则 |
|---|---|
| modeling | 两个 Markdown 存在 |
| programming | 根目录 `.py`/`.m`；根目录或 `results/` 下 `.csv`/`.xlsx`；图三类各 ≥3 且合计 ≥9（每个声明过的子问题三类齐全）；`results/复现清单.json` 五类字段；`python --version` 可执行 |
| paper | `完整论文.docx`；`result` 图 ≥8；`word+latex` 追加 `main.tex` / PDF / `build.json` |

图文件名契约：`^(raw|process|result)_(q\d+)([._-].*)?\.(svg|png)$`。分类（raw/process/result）与子问题（q1..qN）都取自文件名，所以**命名错误等于没有这张图**。

`overall` 取值：任一检查项 `blocked`（环境缺失等外部阻塞）→ `blocked`；全部通过 → `ok`；否则 `missing`。

## 6. 路径与目录解析

| 概念 | 解析方式 |
|---|---|
`SKILL_ROOT` | `import.meta.url` → `<包目录>/assets`；只读；不接受参数覆盖（`mm_project_init(skillRoot=…)` 可指向外部知识库副本，但同样只读） |
`PROJECT_ROOT` | 显式参数 → 指针文件 `<工作区>/.math-modeling/project.json` → 默认 `<工作区>/math-modeling-project`（自动创建） |
工作区 | `agents.currentInitiator().session.header.cwd` → `sandboxPolicy.workspaceRoot` → `fs.resolve('.')` |

约束：`PROJECT_ROOT` 与 `SKILL_ROOT` 必须不同且互不包含（双向 `fs.contains` 校验），否则 `mm_project_init` 直接拒绝 —— 防止把状态写进只读知识库。

## 7. 降级与错误处理

| 情况 | 行为 |
|---|---|
| 缺 `fs` 或 `shell` 服务 | 技能照常注册；`mm_*` 不注册；`console.error` 打一行说明 |
| 工具未初始化 | 所有工具返回 `{ ok: false, error: '项目未初始化' }`（`mm_state` 例外，返回 `initialized: false` + 指向 `mm_project_init` 的下一动作） |
| `shell` 不可用、目录不存在 | `ensureDir` 用占位文件兜底创建（`fs.writeText` 原子写内部 `mkdir -p`） |
| 无 Python | 交付物检查标 `blocked`（不是 `missing`），提示装依赖后复验 |
| 门禁回执不合规 | 拒收并列出缺失字段 / 类型错误 |
| 读了 `SKILL_ROOT` 之外的路径 | 返回 `{ ok: false, error: 'path 必须在 SKILL_ROOT 内' }` |
| 状态文件损坏 | `loadState` 解析失败时回退 `freshState()`（等价于未初始化），不会崩掉工具 |

## 8. 扩展点

| 想做什么 | 怎么做 |
|---|---|
| 加一个子技能 | 新建 `assets/skills/mm-xxx/SKILL.md`（frontmatter 三个字段 + 正文），加进 `assets/SKILL.md` 的路由表，重装插件即可被发现 |
| 加一个工具 | 在 `lib/index.js` 的 `tools` 数组里加一项 `{ name, description, parameters, execute }`，`toolDef()` 会自动转成宿主的 JSON Schema 并挂上渲染 |
| 改门禁条款 | 改 `GATES[gate].checks` 数组；改回执字段校验改 `RECEIPT_FIELDS` |
| 改阶段任务清单 | 改 `PHASE_TASKS[phase]`（进入阶段时注入到 `state.phases[phase].tasks`） |
| 改交付物判据 | 改 `checkDeliverables()` / `checkFigures()` / `checkFigures` 的命名正则 |
| 换系统提示协议 | 改 `apply()` 末尾的 `systemPrompt.section({ text: [...] })` |

改完跑 `npm test`（三个自检脚本），再重装插件。