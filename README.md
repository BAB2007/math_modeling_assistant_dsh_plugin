# 数学建模助手 · DSH 插件

`math_modeling_assistant_dsh_plugin` 是一个 **DeepSeek Harness（DSH）bundle 插件**。装上之后，任何会话只要碰到数学建模任务，就自动获得一套**带强制门禁的数模流水线**：10 个技能、9 个 `mm_*` 工作流工具、6.3 MB 随包知识库，覆盖「读题 → 建模 → 求解 → 出图 → 论文」全过程。

| 项 | 值 |
|---|---|
| 仓库名 | `math_modeling_assistant_dsh_plugin` |
| 插件包名 / bundle id | `dsh-math-modeling` / `math-modeling` |
| 版本 | v1.0.0 |
| 形态 | DSH bundle：`package.json` 的 `dsh.bundle.patch` → `cordis.patch.yml` → 插入宿主行 `id: math-modeling` |
| 适用比赛 | CUMCM 国赛、MCM/ICM 美赛、APMCM、MathorCup、校赛与课程建模作业 |
| 知识来源 | 四个开源技能库整合，逐项来源与许可见 [NOTICE.md](./NOTICE.md) |

> **它和"再写一个提示词"的区别**：本插件把流程做成**状态机 + 门禁**。模型不能靠自觉跳过验收步骤 —— 前置门禁没 PASS，下一阶段根本进不去；交付物文件没落地，`mm_complete` 只会返回阻塞清单。

---

## 目录

- [1. 它拦住了什么](#1-它拦住了什么)
- [2. 框架](#2-框架)
- [3. 安装](#3-安装)
- [4. 使用方法](#4-使用方法)
- [5. 技能清单](#5-技能清单)
- [6. 仓库结构](#6-仓库结构)
- [7. 自检](#7-自检)
- [8. 环境要求与已知限制](#8-环境要求与已知限制)
- [9. 来源与许可](#9-来源与许可)

---

## 1. 它拦住了什么

| 环节 | 常见塌方 | 本插件的硬约束 |
|---|---|---|
| 读题 | 漏附件、漏子问题、量纲与取值范围没看 | 建模手强制建立「题目 / 目标 / 约束 / 数据字段 / 输出要求」清单；`mm_check_deliverables` 卡 `题目分析报告.md`、`术语表格.md` |
| 选模型 | 一套模板套所有题、堆模型冒充创新 | 每道子问题 ≤2 个独立模型体系（同机理不同精度算一个族）；M1 逐条验收 |
| 写代码 | 跑不起来也继续算、结果不可复现 | P1「最小可运行结果」PASS 后才允许全量计算；`results/复现清单.json` 卡种子 / 输入哈希 / 版本 / 参数 / 唯一命令 |
| 出图 | 图不够、图不对、图不覆盖子问题 | 文件命名契约 `(raw|process|result)_q<N>_*.png`；三类各 ≥3、合计 ≥9、每个子问题三类齐全；论文阶段 `result` 图 ≥8 |
| 写论文 | 结论无证据、图表引用错位、Word 公式变图片 | W1 证据大纲（每条结论必须有公式/表/图/代码输出/文献位置）+ W2 论文终检；Word 走原生 OMML 公式 |
| 收尾 | 自称完成，实际缺口一堆 | `mm_complete` 要求五门禁全 PASS + 三阶段交付物齐全 + 门禁通过后产物无漂移（改过就作废重验） |

## 2. 框架

### 2.1 四层结构

```text
┌──────────────────────── DSH 宿主 (Host) ────────────────────────┐
│  skills 服务      ← 10 个技能：路由 math-modeling + 9 个子技能     │
│  tools 服务       ← 9 个 mm_* 工作流工具（init/state/phase/gate…） │
│  systemPrompt     ← order 5000 的数模协议段（强制流程，不降级）    │
└────────────────────────────▲────────────────────────────────────┘
                             │ apply(ctx) 注册；全部挂在 ctx.effect 上，卸载即注销
┌────────────────────────────┴────────────────────────────────────┐
│ bundle 层   package.json: dsh.bundle.patch → cordis.patch.yml     │
│             - insert: [{ id: math-modeling, name: dsh-math-modeling }]
└────────────────────────────▲────────────────────────────────────┘
┌────────────────────────────┴────────────────────────────────────┐
│ 工作流层    三阶段 × 五门禁 状态机 + PROJECT_ROOT/.math-modeling/  │
│             modeling(M1) → programming(P1→P2) → paper(W1→W2)      │
└────────────────────────────▲────────────────────────────────────┘
┌────────────────────────────┴────────────────────────────────────┐
│ 知识库层    assets/ ≈6.3 MB：SKILL.md 路由 / skills/ 9 个子技能    │
│             roles/ 三角色细则 / algorithms/ 7 类算法 / tools/ 工具链│
│             references/ 交付与调度协议 / vendor/ 四库原始资料       │
└──────────────────────────────────────────────────────────────────┘
```

设计取舍：

- **知识库随包发布**：`SKILL_ROOT` 由 `import.meta.url` 推导为包内 `assets/`，不读配置、不依赖 workspace 路径，整包复制/改名到任何位置都能用。
- **技能只放目录与判据，深度资料按需读**：10 个技能正文合计约 120 KB，模型先加载技能，需要细节时用 `mm_skill_read` 读 `algorithms/`、`roles/`、`tools/`、`vendor/` 下的原文 —— 避免一次性把 6 MB 灌进上下文。
- **工具只做"记账与校验"，不做生成**：生成（代码、图、论文）仍由模型完成，插件负责卡门禁、留存证据链、判断完成度。

### 2.2 三阶段 × 五门禁

| 阶段 | 角色技能 | 主要产出 | 门禁 | 放行条件 |
|---|---|---|---|---|
| `modeling` 建模手 | `mm-modeling` | `题目分析报告.md`、`术语表格.md` | **M1** 建模终检 | 子问题覆盖 / 假设依据 / 公式与符号 / 单位与约束 / 模型数量 / 可实现性 / 验证方案 / 文献可追溯性 |
| `programming` 编程手 | `mm-coding`（+`mm-science`/`mm-stats`/`mm-figure`） | 可运行代码、结果表、三类候选图、`results/复现清单.json` | **P1** 最小可运行结果 | 从 `PROJECT_ROOT` 执行最小命令 / 真实输入或等价小实例 / 退出码 / 关键结果 / 单位与范围 / 模型合同 |
| `programming` 编程手 | 同上 | 同上 | **P2** 编程终检 | 独立复现 / 输入哈希 / 随机种子 / 关键数值 / 边界与量纲 / 各子问题图表数量与语义 / 复现清单 / 文件完整性 |
| `paper` 论文手 | `mm-paper`（+`mm-search`/`mm-word`/`mm-figure`） | `完整论文.docx`、正式图 ≥8、可选 LaTeX 与 PDF | **W1** 证据大纲 | 每个子问题结论都有公式 / 结果表位置 / 图文件 / 代码输出 / 已核验文献支撑 |
| `paper` 论文手 | 同上 | 同上 | **W2** 论文终检 | 当届规则 / 主张—证据 / 数值与单位 / 图表引用 / 文献 / 实际渲染 / Word-LaTeX 一致性（双格式时） |

门禁顺序固定 `M1 → P1 → P2 → W1 → W2`，前置未 PASS 直接拒绝（`mm_gate` 返回前置门禁未通过）。

### 2.3 门禁是怎么"硬"起来的

```text
mm_gate gate=M1 mode=prepare        # 1. 生成质检简报：验收条款 + 输入快照 + 固定回执 JSON 模板
   ↓
subagent(简报, 只读)                 # 2. 主 Agent 派发独立 Subagent —— 作者自检不算数
   ↓  返回 { scope, inputSnapshot, status, evidence[], findings[], rework }
mm_gate gate=M1 mode=record         # 3. 记录回执
   ↓
status=PASS  → 解锁下一阶段          status=FAIL → 按 findings 返工 → mm_log → 复验
```

- `prepare` 会把当前 `PROJECT_ROOT`、子问题列表、证据快照写进简报，Subagent 拿到的是可核对的路径，不是转述。
- `record` 会校验回执结构：缺 `scope/inputSnapshot/status/evidence/findings/rework` 任一字段直接拒收；`PASS` 且 `evidence` 为空同样拒收。
- 每次 PASS 会顺手记下该阶段产物快照（文件大小/版本），`mm_complete` 据此做**漂移检测**：门禁过了又偷偷改文件，完成判定会回退成"需复验"。

### 2.4 状态与断点续做

- 状态文件：`PROJECT_ROOT/.math-modeling/state.json`（`version: 6`，含 `project` / `currentPhase` / `phases` / `deliverables` / `ledger`）。
- 项目指针：`<工作区>/.math-modeling/project.json`，记录上次选定的 `PROJECT_ROOT` 与 `SKILL_ROOT`。
- `PROJECT_ROOT` 解析顺序：**显式参数 → 指针文件 → 默认 `<工作区>/math-modeling-project`（自动创建）**。因此 `mm_state` / `mm_gate` / `mm_todo` 这些无参工具永远指向同一个项目，不会被会话 cwd 漂移带偏。
- 换题：重新 `mm_project_init(projectRoot="...")`，新目录即新项目；旧项目状态留在原目录，`mm_project_init(projectRoot=<旧目录>)` 可续接，不覆盖既有门禁与交付物状态。

## 3. 安装

### 3.1 前置

| 依赖 | 必要性 | 说明 |
|---|---|---|
| DeepSeek Harness（支持 bundle patch 的版本） | 必须 | 插件通过 `cordis.patch.yml` 挂载 |
| Node.js ≥ 18 | 仅自检需要 | 运行 `scripts/*.mjs` |
| Python 3 + `python-docx`、`matplotlib` 等 | 出论文/图时需要 | 缺失时 `mm_check_deliverables` 报 `blocked`，不会假通过 |
| LaTeX 引擎（XeLaTeX） | 可选 | 仅 `paperFormat=word+latex` 时需要 |

### 3.2 获取代码

```bash
git clone https://github.com/BAB2007/math_modeling_assistant_dsh_plugin.git
# 或 Gitee 镜像
git clone https://gitee.com/BAB2007/math_modeling_assistant_dsh_plugin.git
```

### 3.3 装进 Harness profile（推荐）

在会话里调用插件管理工具，传入 clone 下来的目录绝对路径：

```text
plugin_manager({ action: "install_bundle", target: "<clone 路径>" })
```

等价的手工方式（编辑当前 profile 的 `package.json`）：

```jsonc
{
  "dependencies": {
    "dsh-math-modeling": "link:<clone 路径>"     // 或 file:<clone 路径>
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-math-modeling"                       // 追加本插件
      ],
      "patchReload": "live"                       // live 时改动即时生效，否则重启 DSH
    }
  }
}
```

安装结果的 `application` 字段说明本次是即时生效还是需要重启 DSH；需要重启就重启一次再验收。

### 3.4 验收（30 秒）

| 检查项 | 期望 |
|---|---|
| 技能目录 | 出现 `math-modeling` 与 9 个 `mm-*` 技能 |
| 工具 | 会话里可调用 `mm_project_init`、`mm_state` 等 9 个工具 |
| 空状态 | `mm_state` → 「项目: 未初始化」 |
| 初始化 | `mm_project_init()`（不传参数）→ 自动创建 `<工作区>/math-modeling-project` 并回显 `PROJECT_ROOT` / `SKILL_ROOT` / 五门禁看板 |
| 插件页 | 设置 → 插件 → 「数学建模 Skill Suite」（图标 `icon.svg`） |

### 3.5 卸载

```text
plugin_manager({ action: "remove_bundle", target: "dsh-math-modeling" })
```

卸载只移除技能与工具注册，已生成的 `PROJECT_ROOT/.math-modeling/state.json` 留在原地，重新安装后可继续续接。

## 4. 使用方法

### 4.1 最短路径

```text
mm_project_init()                                  # 开题：默认目录 + CUMCM + q1
mm_phase_enter phase="modeling"                     # 进建模手：读回角色规范 + 注入 7 条任务
mm_state                                            # 随时看板：阶段/门禁/任务/下一动作
mm_complete                                         # 收尾：五门禁 + 交付物 + 漂移检测
```

更完整的开题参数：

```text
mm_project_init(
  title        = "2026 国赛 A 题：多源数据下的协同调度",
  competition  = "CUMCM",
  edition      = "2026",
  subproblems  = "q1,q2,q3",
  paperFormat  = "word",            # 需要 LaTeX 时填 "word+latex"
  projectRoot  = "D:/contest/2026-A" # 省略则自动创建 <工作区>/math-modeling-project
)
```

### 4.2 一次完整数模题的标准跑法

```text
① 建模手
mm_phase_enter phase="modeling"
  skill(mm-modeling)                     # 拆题、选模型、写假设与符号
  mm_skill_read path="references/算法索引.md"       # 需要时再深读
  mm_skill_read path="algorithms/03-优化类模型.md"
结果：题目分析报告.md + 术语表格.md
mm_gate gate="M1" mode="prepare"          # → 派发只读 Subagent → 回执
mm_gate gate="M1" mode="record" receipt={... status:"PASS" ...}

② 编程手
mm_phase_enter phase="programming"
  skill(mm-coding) + skill(mm-science)    # 求解链与环境
  skill(mm-stats)                         # 检验 / 灵敏度 / 误差
  P1：先把最小可运行结果跑通并记账
  skill(mm-figure)                        # 数据剖析 → 图表契约 → 三类候选图
结果：代码 + results/*.csv + figures/raw|process|result_q<N>_*.png + results/复现清单.json
mm_check_deliverables phase="programming" # 先自查，再走 P2

③ 论文手
mm_phase_enter phase="paper"
  skill(mm-paper) + skill(mm-search)      # 结构、摘要、检索与引用核验
  skill(mm-word)                          # docx（OMML 公式 / 三线表）与 LaTeX 编译
结果：完整论文.docx（+ 完整论文-LaTeX/main.tex、完整论文.pdf、完整论文.build.json）
mm_gate gate="W1" … → mm_gate gate="W2" …

④ 收尾
mm_check_deliverables
mm_complete
```

### 4.3 工具速查

| 工具 | 关键参数 | 作用 |
|---|---|---|
| `mm_project_init` | `skillRoot?` `projectRoot?` `title?` `competition?` `edition?` `subproblems?` `paperFormat?` `optionalCollab?` | 初始化或续接项目，写状态文件与项目指针，回显激活清单 |
| `mm_state` | — | 进度看板：阶段、五门禁、交付物、任务完成度、下一动作、最近账本 |
| `mm_phase_enter` | `phase`* | 校验前置门禁 → **实际读回**该角色 `SKILL.md` 全文 → 注入 7 条标准任务 |
| `mm_skill_read` | `path`* | 只读读取 `SKILL_ROOT` 内资料；越界路径直接拒绝 |
| `mm_gate` | `gate`* `mode?` `evidence?` `receipt?` | `prepare` 生成质检简报；`record` 校验并记录回执 |
| `mm_check_deliverables` | `phase?` | 确定性交付物检查：文件、图表数量与覆盖、复现清单字段、Python 环境 |
| `mm_complete` | — | 完成判定：五门禁 + 交付物 + 漂移检测，返回完成报告或阻塞清单 |
| `mm_log` | `event`* `details?` | 向账本追加返工/决策记录，用于"修正后复验"追踪 |
| `mm_todo` | `action`* `phase?` `index?` `note?` | 阶段任务看板：`list` / `check` / `reset` |

`*` = 必填。

### 4.4 交付物清单（`mm_check_deliverables` 判据）

| 阶段 | 判定项 |
|---|---|
| `modeling` | `题目分析报告.md`、`术语表格.md` 是否存在 |
| `programming` | `PROJECT_ROOT` 下 `.py`/`.m` 代码；`.csv`/`.xlsx` 结果表（含 `results/`）；`raw_/process_/result_` 三类候选图各 ≥3、合计 ≥9、每子问题三类齐全；`results/复现清单.json` 含 seed / hash / version / param / command 五类字段；`python --version` 可执行 |
| `paper` | `完整论文.docx`；`result` 类正式图 ≥8；`paperFormat=word+latex` 时追加 `完整论文-LaTeX/main.tex`、`完整论文.pdf`、`完整论文.build.json` |

单张图判定规则：文件名匹配 `^(raw|process|result)_(q\d+)([._-].*)?\.(svg|png)$`，例如 `result_q2_loss-curve.png`。分类与子问题都从文件名读，所以**命名即契约**。

### 4.5 项目目录长什么样

```text
PROJECT_ROOT/
  .math-modeling/state.json      # 插件状态（门禁、交付物、账本），勿手改
  题目分析报告.md
  术语表格.md
  solve.py                       # 求解入口（唯一命令要能被复现）
  results/
    q1_result.csv  q2_result.csv …
    复现清单.json                 # seed / sha256 / versions / params / command
  figures/
    raw_q1_distribution.png
    process_q1_feature-shift.svg
    result_q1_curve.png
  完整论文.docx
  完整论文-LaTeX/main.tex        # 可选
  完整论文.pdf                   # 可选
  完整论文.build.json            # 可选，哈希绑定清单
```

### 4.6 常见问题

**Q：能不能跳过门禁直接写论文？**
`mm_phase_enter phase="paper"` 会检查 P2 是否 PASS，`mm_gate` 也会检查前置门禁。绕不过去的正确姿势是：把该补的补上，然后正常走门禁。

**Q：门禁 FAIL 了怎么办？**
按回执里的 `findings` 修，修完 `mm_log(event="rework", details="...")` 记账，再重新 `prepare → 派发 → record`。同一个门禁可以反复记录，以最后一次为准。

**Q：子问题必须叫 q1、q2 吗？**
阶段入口用 `mm_project_init(subproblems="q1,q2,q3")` 声明，图的文件名里同样用 `q1..qN`。名字只是契约，重点是三处一致（项目声明、文件名、论文小节标题）。

**Q：中途换了工作目录，状态会丢吗？**
不会。状态跟随 `PROJECT_ROOT`，而无参工具通过工作区指针找回同一个 `PROJECT_ROOT`；真要跨机器，把整个项目目录拷走即可。

**Q：能自己指定项目目录吗？**
能。传 `projectRoot="D:/contest/2026-A"`：目录不存在会自动创建，只要它不与 `SKILL_ROOT` 相同或互相包含（否则直接拒绝）。不传则用默认的 `<工作区>/math-modeling-project`。

## 5. 技能清单

| 技能 | 作用 | 主要知识来源 |
|---|---|---|
| `math-modeling` | 总入口：三角色流程、五门禁、9 个子技能路由、资料索引 | 四库整合 |
| `mm-modeling` | 建模手：题目解剖、模型选择、假设与符号、M1 终检 | math-modeling-skill |
| `mm-coding` | 编程手：求解链、环境检查、P1/P2、复现清单、候选图 | math-modeling-skill |
| `mm-science` | 问题类型 → 求解栈映射，Python / MATLAB 对照 | scientific-agent-skills |
| `mm-stats` | 检验决策树、灵敏度、误差传播、报告规范 | scientific-agent-skills + nature-skills |
| `mm-figure` | 出版级图表：契约、选图型、布局门禁、机械审计、读图复核 | nature-skills + scientific-agent-skills |
| `mm-search` | 文献检索、去重、DOI 核验、GB/T 7714 与 APA 7 | nature-skills + academic-research-skills |
| `mm-word` | Word（OMML 公式、三线表）与 LaTeX 产物、格式门禁 | math-modeling-skill + nature-skills |
| `mm-paper` | 论文结构、摘要模板、Claim-Evidence 映射、英文化 | academic-research-skills + nature-skills |
| `mm-review` | 五门禁验收条款、固定回执、独立只读 Subagent、返工复验 | 四库整合 |

加载方式：先 `skill(math-modeling)` 拿路由，再按当前任务加载对应子技能 —— 不要一次性全加载。

## 6. 仓库结构

```text
math_modeling_assistant_dsh_plugin/
  package.json                  # dsh.bundle.patch → cordis.patch.yml；npm scripts 走自检
  cordis.patch.yml              # 插入宿主行 id: math-modeling
  lib/
    index.js                    # 技能注册 + 9 个 mm_* 工具 + 系统提示段（单文件，无运行时依赖）
    types/index.d.ts
  locale/zh.json  locale/en.json  icon.svg
  scripts/
    verify-plugin.mjs           # 技能发现与 frontmatter 校验
    check-links.mjs             # 知识库路径引用校验
    simulate.mjs                # mock ctx 驱动真实 apply() 的全链路模拟
  docs/
    framework.md                # 框架细节：状态机、工具契约、门禁与漂移检测
    usage.md                    # 端到端实操：一次数模题的完整跑法
  assets/                       # 随包知识库（≈6.3 MB，只读）
    SKILL.md                    # 路由技能 = skill(math-modeling)
    skills/mm-*/SKILL.md        # 9 个子技能
    roles/{建模手,编程手,论文手}/ # 角色细则 + check_env / repro_manifest / plot_style / figure_audit
    algorithms/01..07-*.md      # 优化 / 预测 / 评价 / 图论 / 统计 / 综合 / 机器学习
    tools/{docx,figure,latex,paper_search,pdf,xlsx}/
    references/                 # 算法索引、Subagent 调度、交付协议、质检清单
    vendor/{nature,academic,scientific}/
    使用指南.md

  README.md  NOTICE.md  LICENSE  .gitignore
```

## 7. 自检

三个脚本都不依赖 Harness，只依赖 Node ≥ 18，可在仓库任意位置执行：

```bash
node scripts/verify-plugin.mjs   # 应输出 total = 10 bad = 0
node scripts/check-links.mjs    # 应输出「全部知识库引用均可解析 ✓」
node scripts/simulate.mjs       # mock ctx 跑通 init → phase → todo → gate → complete
# 或
npm test
```

`simulate.mjs` 验证的行为：注册 9 工具 + 10 技能、默认目录自动创建、指针文件落盘、阶段进入读回技能全文、任务看板 7 项、门禁简报生成、`mm_skill_read` 越界拦截、回执记录、完成判定返回阻塞清单。它会把临时工作区放在 `.sandbox/`（已 gitignore）。

## 8. 环境要求与已知限制

- **知识库只读**：`assets/` 是 `SKILL_ROOT`，插件拒绝写入；要改内容请改包内文件后重装。
- **缺 `fs`/`shell` 服务时降级**：插件仍注册 10 个技能，只是不注册 `mm_*` 工具（日志会打印一行说明）。
- **Python 依赖**：论文与图表脚本链依赖本机 Python（`python-docx`、`matplotlib`、`pandas` 等）；缺失时交付物检查返回 `blocked` 而不是假装通过。
- **LaTeX 可选**：只有 `paperFormat=word+latex` 才要求 `main.tex` + 真实编译出的 PDF + `build.json`。
- **门禁需要 Subagent**：`prepare` 只生成简报，真正的评审由主 Agent 派发独立只读 Subagent 完成 —— 宿主若不支持 subagent，则需人工按简报逐条核对后自行 `record`。
- **状态文件是人类可读的 JSON**，但字段语义由插件维护，手工修改可能导致门禁判据与产物不一致。

## 9. 来源与许可

本仓库把四个开源技能库整合为一套 DSH 插件，逐项来源、整合范围与许可条款见 **[NOTICE.md](./NOTICE.md)**：

| 来源 | 许可 | 在本仓库中的位置 |
|---|---|---|
| [XiaoMaColtAI/math-modeling-skill](https://github.com/XiaoMaColtAI/math-modeling-skill) | 仓库未附 LICENSE（默认版权保留） | `assets/references/`、`assets/roles/`、`assets/algorithms/`、`assets/tools/` |
| [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | MIT | `assets/vendor/scientific/` |
| [Imbad0202/academic-research-skills](https://github.com/Imbad0202/academic-research-skills) | CC BY-NC 4.0（**禁止商业用途**） | `assets/vendor/academic/` |
| [Yuan1z0825/nature-skills](https://github.com/Yuan1z0825/nature-skills) | Apache-2.0 | `assets/vendor/nature/` |

- 本仓库原创部分（插件代码 `lib/`、`cordis.patch.yml`、`scripts/`、`docs/`、本次撰写的技能正文与路由层）：**MIT**，见 [LICENSE](./LICENSE)。
- 第三方内容保留其原始许可；由于包含 CC BY-NC 4.0 与未声明许可的内容，**整包不构成可直接商业再分发的成果**，商业使用请逐项替换或取得原作者授权。