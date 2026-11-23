---
name: mm-coding
description: 编程手阶段规范：可复现求解、结果落盘、候选图生产与 P1/P2 门禁。写代码、跑数、出图、做复现清单或需要"跑通并留证据"时加载。
whenToUse: 建模手产物（题目分析报告.md / 术语表格.md）已就绪，需要实现模型、求解、批量计算、出图、做结果表或复现清单，或在 P1/P2 门禁被判定 FAIL 后返工时使用。
---

# 编程手：可复现求解与 P1/P2 门禁

编程手的目标不是"跑出数"，而是**留下别人能重跑的证据链**：同一条命令、同一份输入、同一组种子，能得到同一组关键数值。

## 何时用 / 何时不用

- 用：模型已定（M1 通过），要写代码、跑全量、出候选图、做结果表、生成复现清单。
- 用：P1 或 P2 门禁 FAIL，需要按证据返工。
- 不用：模型还没定 → 先回 `mm-modeling`；要正式论文图 → 配合 `mm-figure`；要导出 Word/LaTeX → `mm-word`。

## 核心原则

1. **先小后大**：任何全量计算前，必须先用真实输入或等价小实例跑通一条最小命令（P1）。
2. **一条命令可复现**：结果必须能由单一入口命令 + 显式参数 + 固定种子重现。
3. **真实运行**：退出码、异常、警告都检查；禁止手写或臆造结果数值。
4. **只写 PROJECT_ROOT**：输入附件与知识库只读。
5. **缺依赖如实报告**：报告确切包名/工具箱，不静默换语言或换实现。
6. **图与数据同源**：每张图的每个数值都能追到具体数据文件与脚本位置。

## 目录与命名

```
PROJECT_ROOT/
  code/
    common/            # 数据读取、清洗、通用工具
    q1_solve.py        # 每个子问题一个入口
    q2_solve.py
  data/                # 只读输入（不改原文件）
  results/             # 结果表 csv/xlsx + 复现清单.json
  figures/             # 候选图与正式图（raw_/process_/result_/flow_ 前缀）
  logs/                # 命令输出、退出码、运行环境快照
```

- 子问题统一规范为 `q1…qN`（来自 `题目分析报告.md` 的子问题清单），所有文件名、图名、表名都用同一套编号。
- 禁止把所有逻辑塞进一个脚本；`common/` 之外的文件不应重复实现数据处理。

## 求解链

固定五段，每段有明确输入输出契约（列名、单位、索引）：

1. `io`：读取原始附件 → 原始表（不改动源文件，记录行列数与缺失）。
2. `clean`：缺失/异常/量纲/时间与空间范围处理 → 清洗表 + 处理日志（删行、聚合、抽样必须记录数量与理由）。
3. `solve`：模型求解 → 参数/解/目标值，写入 `results/qN_*.csv`。
4. `analyze`：灵敏度、误差、稳健性、对照模型 → `results/qN_sensitivity.csv` 等。
5. `export`：结果表（xlsx/csv）、图、复现清单。

每段都要能单独运行（`python code/q1_solve.py --stage analyze`），便于局部返工。

## 环境与依赖检查

```powershell
# Python：只检查所选模型真正用到的功能
python "<SKILL_ROOT>/roles/编程手/scripts/check_env.py" --features data visualization optimization
```

可选功能名：`data`、`visualization`、`excel`、`optimization`、`integer-optimization`、`statistics`、`machine-learning`、`time-series`、`graph`、`image`。

```matlab
addpath("<SKILL_ROOT>/roles/编程手/scripts");
report = check_matlab_env(["data", "visualization", "optimization"]);
assert(report.ok, "缺少所选模型需要的 MATLAB 工具箱");
```

缺少依赖时：报告精确名称（包/工具箱/版本），保留原方案，缩小实例继续验证可验证部分。

## P1 最小可运行结果（进入全量计算与正式出图的前置门禁）

动作顺序固定：

1. 从 `PROJECT_ROOT` 执行一条最小命令（真实输入，或规模等价的小实例）。
2. 记录：命令原文、cwd、退出码、耗时、关键输出 3–5 个数值、单位与取值范围。
3. 与模型合同对照：变量含义、量纲、约束是否满足、边界是否合理。
4. 由**独立只读 Subagent** 验收并回执 `PASS/FAIL/BLOCKED`；作者自检不能替代。
5. P1 未 PASS 之前，禁止全量计算与正式出图。

P1 记录表模板：

| 项 | 内容 |
|---|---|
| 最小命令 | `python code/q1_solve.py --limit 200` |
| cwd | `PROJECT_ROOT` |
| 退出码 | 0 |
| 关键输出 | 目标值 1234.5（元/日）、约束违反 0、迭代 47 次 |
| 量纲/范围 | 目标值 ∈ [0, 1e6]，与题意一致 |
| 与模型合同差异 | 无 |
| 验收回执 | `PASS`（Subagent 回执见 mm_gate 记录） |

## 可视化执行链（P1 通过后）

1. 读 `tools/figure/SKILL.md` 与 `tools/figure/references/guides/data_profiling.md`，先做数据剖析（行列、表头、缺失、分组样本量、分布、异常、单位）。
2. 建立图表契约：每张图回答哪个子问题的什么问题、核心结论、证据/面板映射、统计口径、最终尺寸。
3. 生成三类候选图，命名前缀固定：
   - `raw_qN_*`：原始/清洗后数据的分布、异常、分组样本量；
   - `process_qN_*`：求解过程、收敛、参数敏感性、中间量；
   - `result_qN_*`：最终结论图（预测对比、方案对比、路径/布局、评价排序）。
   每类 ≥3 张逻辑图、合计 ≥9 张，且**每个子问题在三类中各至少 1 张**。
4. 额外生成建模流程图（`tools/figure/references/chart-types/flowchart.md`）：输入 → 子问题依赖 → 模型 → 求解 → 验证 → 输出；流程图不计入三类候选图配额，但必须覆盖全部子问题。
5. 每个子问题产出 `results/qN_analysis.csv`，图注中的 n、中心统计量、区间/离散程度、检验与校正按 `mm-stats` 计算，禁止硬编码 p 值。
6. 人工确认：实际打开最终 PNG 与 `_qa` 灰度预览，用一句话复述第一视觉结论；检查缺字、裁切、遮挡、灰度可辨、坐标截断。

## 复现清单与结果落盘

```powershell
python "<SKILL_ROOT>/roles/编程手/scripts/repro_manifest.py" --root "<PROJECT_ROOT>" --out "<PROJECT_ROOT>/results/复现清单.json"
```

`results/复现清单.json` 必须含：

- 环境：Python/MATLAB 版本、关键包版本；
- 输入：每个输入文件的 SHA-256、行数、列数；
- 参数：随机种子、求解器参数、网格/步长；
- 命令：唯一复现命令（单条，可直接粘贴执行）；
- 产物：结果表与图的相对路径清单；
- 关键数值：3–5 个可作为回归基线的数字。

结果表规范：首行表头，必须包含单位列或单位后缀，数值精度与有效数字一致；布尔/类别列用固定词表。

## MATLAB 规范要点

- 函数文件与脚本分离；脚本只做编排，模型逻辑放在函数里。
- `rng(seed)` 显式固定；所有可调参数集中在文件顶部或 `params.m`。
- 路径用相对 `PROJECT_ROOT` 的写法（`fullfile(root, 'data', ...)`），不写死绝对路径。
- 出版级绘图走 `apply_publication_style.m` / `export_publication_figure.m` / `audit_publication_figure.m`，与 Python 的 `plot_style.py` / `figure_audit.py` 保持同一套视觉基线。

语言选择判据：模型依赖 MATLAB 工具箱（如 Optimization Toolbox、Curve Fitting）、或题目/队伍约定要求 MATLAB 时用 MATLAB；其余默认 Python（库生态与复现性更好）。

## P2 编程终检（交付前门禁）

| 检查项 | 判定标准 |
|---|---|
| 独立复现 | 在未改动的干净目录跑唯一命令，退出码 0，关键数值与基线一致 |
| 输入哈希 | `复现清单.json` 中每个输入文件 SHA-256 与当前文件一致 |
| 随机种子 | 所有随机算法显式种子，重复两次结果一致 |
| 关键数值 | 3–5 个回归基线数字逐项对齐 |
| 边界与量纲 | 边界 case、量纲、取值范围检查通过，无 NaN/inf/溢出残留 |
| 图表数量与语义 | 每个子问题三类候选图各 ≥1，总 ≥9，流程图覆盖全部子问题 |
| 复现清单 | 字段齐全，命令可执行 |
| 文件完整性 | 结果表、图、清单三者一致，无孤立文件 |

以上全部经独立只读 Subagent 回执 PASS 后，方可进入论文阶段。

## 检查清单

- [ ] 模型定稿（M1 已 PASS），代码只实现该模型，未偷偷换模型。
- [ ] 目录结构符合约定，子问题编号 q1..qN 全局一致。
- [ ] 最小命令已跑通并留有退出码与关键输出。
- [ ] 随机种子、求解器参数、步长全部显式。
- [ ] 求解稳健性已排查（溢出/NaN、病态、多初始值、收敛、内存、超时降级）。
- [ ] 结果表含单位与精度说明；删行/抽样有记录。
- [ ] 三类候选图各 ≥3 且每子问题覆盖；流程图已生成；SVG 与 ≥300 DPI PNG 成对。
- [ ] `check_figure.py` 与 `figure_audit.py --strict` 返回 0。
- [ ] 已实际读图并复核中文/符号缺字、裁切、遮挡、灰度可辨。
- [ ] `复现清单.json` 字段齐全且命令可执行。
- [ ] 所有新文件都在 `PROJECT_ROOT` 内。
- [ ] P1、P2 回执均为 PASS，且 PASS 后产物未发生未复验的变化。

## 与数模三角色的衔接

- 上游 `mm-modeling`：读入 `题目分析报告.md`、`术语表格.md`；若模型合同与代码实现矛盾，把实际报错与最小复现反馈给建模手，不要自行改模型。
- 下游 `mm-paper` / `mm-word`：交付结果表、三类候选图、流程图、`复现清单.json`；论文中的每条数值与每张图都必须能指回这些文件。
- 旁路 `mm-science`（选库与 API）、`mm-stats`（检验与灵敏度）、`mm-figure`（图表规范与断言）、`mm-review`（门禁验收）。

## 深读索引

| 需求 | 相对路径 |
|---|---|
| 编程手完整工作流程 | `roles/编程手/references/工作流程.md` |
| MATLAB 实现规范 | `roles/编程手/references/MATLAB规范.md` |
| 编程手质检清单（29 条） | `roles/编程手/references/质检清单.md` |
| 环境检查脚本 | `roles/编程手/scripts/check_env.py`、`roles/编程手/scripts/check_matlab_env.m` |
| 复现清单生成 | `roles/编程手/scripts/repro_manifest.py` |
| Python 绘图样式基线 | `roles/编程手/scripts/plot_style.py` |
| 图表机械审计 | `roles/编程手/scripts/figure_audit.py`、`tools/figure/scripts/check_figure.py` |
| 布局门禁与导出 | `tools/figure/scripts/layout_tools.py`、`tools/figure/scripts/export_figure.py` |
| 图表契约与数据剖析 | `tools/figure/references/guides/figure_contract.md`、`tools/figure/references/guides/data_profiling.md` |
| 流程图规范 | `tools/figure/references/chart-types/flowchart.md` |
| MATLAB 出版级绘图脚本 | `roles/编程手/scripts/apply_publication_style.m`、`export_publication_figure.m`、`audit_publication_figure.m` |
| 门禁派发与回执 | `references/Subagent调度.md` |
| 求解栈与库 API | `skills/mm-science/SKILL.md` |
| 图与数据一致性要求 | `vendor/scientific/scientific-visualization/SKILL.md` |

## 常见失败模式

| 症状 | 原因 | 处理 |
|---|---|---|
| 全量跑了 40 分钟才发现单位错 | 跳过 P1 小实例 | 回退：用小实例复现单位错误，修正后重跑 P1 |
| 图很好看但答不了子问题 | 没有图表契约 | 按 `mm-figure` 先写"图—问题—结论"映射再重画 |
| 换个种子结论就变 | 随机算法未固定种子或未多初始值 | 固定种子 + 5 次多初始值，报告最优值分布 |
| 论文里的数字和表格对不上 | 手抄数值或用过期结果 | 结果表为唯一事实源，论文数值只从表/清单取 |
| `figure_audit.py --strict` 报缺子问题覆盖 | 候选图分配不均 | 按 q1..qN 补齐三类各 ≥1，再重跑审计 |
| 复现清单命令在别人机器上跑不了 | 依赖绝对路径或未锁版本 | 用相对路径 + 版本记录 + 单条命令重写清单 |
| 出现 NaN 却继续跑 | 未做稳健性检查 | 加断言：输入范围、中间量有限性、约束满足性 |

> 来源整合：math-modeling-skill（roles/编程手、tools/figure 脚本链）、scientific-agent-skills（scientific-visualization 的图—数据一致性要求）、nature-skills（nature-figure 的证据与可追溯要求）；许可见 assets/NOTICE.md。