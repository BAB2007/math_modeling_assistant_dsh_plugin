# 使用方法：一次完整数模题的实操路线

本文按真实做题顺序走一遍：开题 → 建模手 → 编程手 → 论文手 → 收尾。命令都是工具调用，括号里是"为什么现在做这一步"。机制细节见 [framework.md](./framework.md)。

## 0. 开题前 30 秒

```text
mm_state
```

未初始化时返回 `项目: 未初始化`，下一动作指向 `mm_project_init`。已初始化则显示阶段、五门禁、任务完成度与下一动作 —— 接手别人的项目先看这一屏。

## 1. 开题

```text
mm_project_init(
  title       = "2026 国赛 A 题：<题目名>",
  competition = "CUMCM",          // CUMCM / MCM-ICM / APMCM / MathorCup …
  edition     = "2026",
  subproblems = "q1,q2,q3",       // 与后续图文件名、论文小节一一对应
  paperFormat = "word",           // 需要 LaTeX 时 "word+latex"
  projectRoot = "D:/contest/2026-A"   // 省略则自动建 <工作区>/math-modeling-project
)
```

- `projectRoot` 必须与 `SKILL_ROOT` 不同且互不包含，否则被拒 —— 状态不能写进只读知识库。
- 已存在的项目会**续接**：门禁状态、交付物检查、任务看板、账本全部保留，不会被重置。
- 想额外挑几个协作 Subagent（规则核查、附件清点、文献、原型、实验、英文化、术语）时填 `optionalCollab="rulesCheck,literature"`；只记录到项目配置，是否派发由主 Agent 决定。

## 2. 建模手（modeling）

```text
mm_phase_enter phase="modeling"
```

进入时会**实际读回** `skills/mm-modeling/SKILL.md` 全文并注入 7 条标准任务，这 7 条就是本阶段的检查表：

| # | 任务 | 对应的深读资料 |
|---|---|---|
| 1 | 读题 + 全部附件，建立题目/目标/约束/字段/输出清单 | `roles/建模手/references/前置合同.md` |
| 2 | 数据驱动检查：缺失、异常、量纲、时空范围 | `algorithms/05-统计分析与数据处理算法说明.md` |
| 3 | 先写每问「要回答什么结论」，再评估候选模型 | `references/算法索引.md` |
| 4 | 每子问题选定 ≤2 个独立模型体系（含公式/参数/输入输出/验证/风险） | `algorithms/01..07` |
| 5 | 检索理论依据并核验文献可追溯性 | `skill(mm-search)` → `tools/paper_search/` |
| 6 | 落盘 `题目分析报告.md` + `术语表格.md`，按 `质检清单.md` 自检 | `roles/建模手/references/质检清单.md` |
| 7 | 派发独立只读 Subagent 执行 M1 | `references/Subagent调度.md` |

进度勾选：

```text
mm_todo action="list"
mm_todo action="check" index=0 note="附件 1-3 已解析，字段 17 个"
```

两个产物的最低要求：

- `题目分析报告.md`：题目背景与目标、每个子问题要回答的结论、数据概况与清洗决策、候选模型对比与选择理由、假设与依据、符号表引用、可验证性与风险。
- `术语表格.md`：符号 / 含义 / 单位 / 取值范围 / 首次出现位置。

### M1 建模终检

```text
mm_gate gate="M1" mode="prepare" evidence={
  inputs: ["D:/contest/2026-A/附件1.xlsx", "…/赛题.pdf"],
  deliverablePaths: ["D:/contest/2026-A/题目分析报告.md", "…/术语表格.md"],
  commands: [],
  hashes: {"附件1.xlsx": "sha256:9f2c…"},
  notes: "数据 3 年 12 个月度序列"
}
```

`prepare` 返回 `brief`（验收条款 + 输入快照 + 固定回执模板），把它交给独立只读 Subagent，拿回执后：

```text
mm_gate gate="M1" mode="record" receipt={
  scope: "M1 建模终检：q1-q3 全覆盖",
  inputSnapshot: "题目分析报告.md sha256:ab12… / 术语表格.md sha256:cd34…",
  status: "PASS",
  evidence: ["题目分析报告.md#2 子问题清单 3 条", "术语表格.md 符号 24 个含单位", "算法索引.md#03 评价类：TOPSIS 与熵权法对比"],
  findings: [],
  rework: ""
}
```

`status: "FAIL"` 时不要硬往前走 —— 按 `findings` 返工，见 [第 7 节](#7-返工与记账)。

## 3. 编程手（programming）

```text
mm_phase_enter phase="programming"     # M1 未 PASS 会直接拒绝
skill(mm-coding)                       # 求解链与复现规范
skill(mm-science)                      # 选库 / API 速查 / MATLAB 对照
skill(mm-stats)                        # 检验、灵敏度、误差传播
```

### 3.1 环境与最小可运行结果（P1）

```bash
python <SKILL_ROOT>/roles/编程手/scripts/check_env.py      # 依赖自检，输出缺什么
python solve.py --only q1 --sample 200                     # 最小命令：小实例先跑通
```

P1 要的是**证据**：一条从 `PROJECT_ROOT` 直接可执行的命令、真实输入或等价小实例、退出码、关键结果数值、单位与取值范围、以及结果与模型合同的一致性。跑通再进入全量计算。

### 3.2 全量计算与出图

```text
skill(mm-figure)     # 数据剖析 → 图表契约 → 选图型 → 布局门禁 → 机械审计 → 读图复核
```

图必须按契约命名（分类 + 子问题都在文件名里）：

```text
figures/raw_q1_distribution.png          # 原始数据剖面
figures/process_q1_feature-shift.svg     # 中间过程/对照
figures/result_q1_curve.png              # 结论图（论文正式图从这里选）
```

数量底线：三类各 ≥3、合计 ≥9、每个子问题三类齐全；进入论文阶段后 `result` 图 ≥8。脚本：

```bash
python <SKILL_ROOT>/roles/编程手/scripts/plot_style.py          # 统一风格
python <SKILL_ROOT>/roles/编程手/scripts/figure_audit.py --strict   # 机械审图，返回非 0 即不合格
# MATLAB 路线：
# roles/编程手/scripts/check_matlab_env.m + apply_publication_style.m + export_publication_figure.m + audit_publication_figure.m
```

### 3.3 复现清单（P2 的硬门槛）

```text
python <SKILL_ROOT>/roles/编程手/scripts/repro_manifest.py      # 生成模板
```

`results/复现清单.json` 至少包含这五类顶层字段（键名匹配即通过）：

```json
{
  "command": "python solve.py --all",
  "runtime": { "python": "3.11.9", "numpy": "2.0.1", "pandas": "2.2.2", "matplotlib": "3.9.0" },
  "seed": 20261123,
  "input_sha256": { "data/附件1.xlsx": "9f2c…" },
  "params": { "q1": { "alpha": 0.05, "iterations": 500 } },
  "outputs": ["results/q1_result.csv", "figures/result_q1_curve.png"]
}
```

```text
mm_check_deliverables phase="programming"    # 先自查，缺什么一目了然
mm_gate gate="P1" mode="prepare"  → subagent → mm_gate gate="P1" mode="record"
mm_gate gate="P2" mode="prepare"  → subagent → mm_gate gate="P2" mode="record"
```

P2 的要点是**独立复现**：换一台机器（或干净环境）用清单里的唯一命令能跑出同一批关键数值；因此 `seed`、输入哈希、版本、关键参数、命令五样缺一不可。

## 4. 论文手（paper）

```text
mm_phase_enter phase="paper"          # P2 未 PASS 会拒绝
skill(mm-paper)                       # 结构、摘要、Claim-Evidence、英文化
skill(mm-search)                      # 文献检索与引用核验（GB/T 7714 / APA 7）
skill(mm-word)                        # docx（OMML 公式、三线表）/ LaTeX 编译 / 格式门禁
```

### 4.1 W1 证据大纲

先写大纲而不是先写正文：每个子问题一行，标明结论 → 支撑证据（公式编号 / 结果表文件 / 图文件 / 代码输出行 / 已核验文献）。大纲不过门禁，正文一律返工。

```text
mm_gate gate="W1" mode="prepare" → subagent → mm_gate gate="W1" mode="record"
```

### 4.2 正文与产物

- 结构参照 `roles/论文手/references/章节模板.md`，格式硬项参照 `论文格式规范.md` / `LaTeX格式规范.md`，模板文件 `roles/论文手/references/论文模板.docx`。
- Word：`assets/tools/docx/` 的脚本生成原生 OMML 公式与三线表，禁止把公式贴成图片。
- LaTeX（`paperFormat="word+latex"`）：`assets/tools/latex/` 的 `latex_paper.py init/doctor` 建工程，必须真实编译出 `完整论文.pdf` 并生成 `完整论文.build.json`（哈希绑定清单）。
- 图表引用、数值与单位、文献编号三项由格式门禁脚本机械核对，人眼复核排版与语义。

### 4.3 W2 论文终检

```text
mm_gate gate="W2" mode="prepare" → subagent → mm_gate gate="W2" mode="record"
```

W2 之后**不要再改交付物**：`mm_complete` 会做漂移检测，门禁通过后被改动的文件会让完成判定失效（需重新过 W2）。

## 5. 收尾

```text
mm_check_deliverables                  # 默认查当前阶段
mm_check_deliverables phase="modeling"
mm_check_deliverables phase="programming"
mm_check_deliverables phase="paper"
mm_complete                            # 五门禁 + 交付物 + 漂移检测 → 完成报告或阻塞清单
```

`mm_complete` 的阻塞清单只有三类，逐条清掉即可：未通过门禁、某阶段交付物未齐全、门禁后产物漂移。全清后返回 `COMPLETE` 报告（含门禁时间线、交付物检查、账本摘要）。

## 6. 多题并行与续接

- 一题一目录：不同 `projectRoot` 就是不同项目，状态互不干扰。
- 换题：直接 `mm_project_init(projectRoot="<新目录>", title="…")`，工作区指针随之更新，之后的无参工具指向新项目。
- 回旧题：`mm_project_init(projectRoot="<旧目录>")`，只续接不重置。
- 换机器：整个 `PROJECT_ROOT` 拷走即可（状态、交付物、图都在里面）；`SKILL_ROOT` 跟着插件走，不需要拷。

## 7. 返工与记账

```text
mm_log event="rework" details="M1 FAIL：q2 缺少灵敏度分析；补 OAT + Sobol 后复验"
# 修产物
mm_gate gate="M1" mode="prepare"   # 重新出简报
# 重新派发、重新 record
```

同一个门禁可以 record 多次，以最后一次为准（`prevStatus` 会告诉你之前是什么状态）。账本事件会出现在 `mm_state` 的尾部与 `mm_complete` 报告里，形成"发现 → 修正 → 复验"的可追溯链。

## 8. 常见故障对照

| 现象 | 原因 | 处理 |
|---|---|---|
| `mm_phase_enter phase="programming"` 被拒 | M1 未 PASS | 先把 M1 走完，或查看 `mm_state` 的门禁行 |
| 交付物检查 `候选图 ... 需≥3` | 图不足或命名不合契约 | 按 `raw_q1_*.png` 重命名/补图，`figure_audit.py --strict` 通过 |
| `子问题 q3 图覆盖 缺少: process` | 某子问题缺某一类图 | 补 `process_q3_*.svg` |
| `复现清单.json 缺少字段: 随机种子` | JSON 里没有 seed 类键 | 加 `seed` 并把种子写进代码 |
| `Python 环境 ... blocked` | 本机没有 python 或不在 PATH | 装 Python 并确保 `python --version` 可执行 |
| `LaTeX 源码项目 main.tex 缺失` | `paperFormat=word+latex` 但没建工程 | 走 `assets/tools/latex/` 的 `init`，或把 `paperFormat` 改成 `word` |
| `门禁通过后产物发生变化` | W2 后改过文件 | 重新过对应门禁再 `mm_complete` |
| 工具报 `项目未初始化` | 当前工作区没有指针，也没传 `projectRoot` | 先 `mm_project_init`，或传 `projectRoot` 续接 |