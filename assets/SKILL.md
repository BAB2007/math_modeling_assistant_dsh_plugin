---
name: math-modeling
description: 数学建模与建模竞赛总入口（四库整合版）：三角色流程、M1/P1/P2/W1/W2 五门禁、9 个子技能路由、算法库与工具链索引。接到数模题、建模分析、求解或写数模论文时先加载本技能。
whenToUse: 用户提出数学建模、建模竞赛（国赛 CUMCM / 美赛 MCM-ICM / 研赛 / 亚太赛等）、题目分析、模型选择、代码求解、结果可视化、数模论文写作或交付检查时使用；单一角色任务也可直接用对应子技能。
---

# 数学建模 Skill Suite（总入口）

本技能把四个来源库整合成一套可执行的数模作业体系。**结论先行：先读本文件确定阶段与技能，再按需加载子技能与资料，禁止一次性把资料库全部读入。**

| 来源 | 本插件中承担的部分 |
|---|---|
| math-modeling-skill | 三角色流程、五门禁、7 类算法库、docx/latex/figure/pdf/xlsx/paper_search 工具链脚本 |
| scientific-agent-skills | 科学计算与统计库速查（scikit-learn / statsmodels / sympy / networkx / pymoo / simpy / matplotlib / seaborn / aeon 等） |
| academic-research-skills | 论文写作与评审框架（academic-paper / academic-paper-reviewer / deep-research / academic-pipeline） |
| nature-skills | 出版级图表、学术写作与润色、文献检索与引用核验、论文转 Word |

## 强制协议（不要降级为建议）

1. 首个进度更新必须回显：已激活本技能、`SKILL_ROOT`、`PROJECT_ROOT`、当前阶段、目标竞赛与届次、本轮计划加载的技能与资料入口。未核验的官方规则标为「待核验」。
2. 时间与规则以**当届官方规则**为准；不得用往届经验替代官方要求（页数、格式、提交物、匿名要求）。
3. 每个阶段开始前必须实际读取该阶段技能全文（`mm_phase_enter` 会返回并由你逐条落实），知道路径不等于已执行。
4. 模型数量约束：**每道子问题最多两个独立模型体系**；同一机理的不同精度（如 Euler 与 RK4）按一个模型族计数。禁止直接套用常见简单模型冒充创新；不得因为两个模型结论接近就强行删除其一。
5. 门禁独立验收：M1/P1/P2/W1/W2 必须由**未参与撰写的独立只读 Subagent** 验收并回执；作者自检不能替代独立验收。
6. 任何校验预警视为「未完成」：不得静默降低篇幅、图表数量、公式质量、引用真实性或编译质量目标。
7. 环境缺依赖、缺搜索引擎、缺渲染器时：如实报告阻塞，继续完成仍可验证的部分，禁止静默换实现或跳过验证。
8. 宣称完成前必须跑 `mm_complete`：五门禁全 PASS + 三阶段交付物齐全 + 门禁通过后产物无实质变化。
9. 只写 `PROJECT_ROOT`：不得改写 `SKILL_ROOT`（内置知识库只读），输入附件只读，改模板先复制到项目内。
10. 最终回复必须列出：实际读取的入口、实际运行的关键命令与退出码、门禁状态、核心质量指标、仍存在的阻塞。

## 技能路由表

| 触发意图 | 加载技能 | 何时必须 |
|---|---|---|
| 读题、拆子问题、选模型、写假设与符号 | `mm-modeling` | 建模手阶段开始（强制） |
| 写代码、跑通、结果落盘、复现 | `mm-coding` | 编程手阶段开始（强制） |
| 求解器/库函数怎么用、Python 与 MATLAB 对照 | `mm-science` | 需要选具体库或 API 时 |
| 统计检验、显著性、灵敏度、误差与不确定度 | `mm-stats` | 结果分析与检验环节 |
| 画图、图表规范、图表质检 | `mm-figure` | P1 通过后正式出图前（强制） |
| 文献检索、引用格式、引用核验 | `mm-search` | 需要理论依据或参考文献时 |
| 生成 Word / LaTeX、格式合规 | `mm-word` | 论文手阶段排版环节 |
| 写论文、摘要、章节、英文化 | `mm-paper` | 论文手阶段正文写作 |
| 自检、五门禁、独立评审、返工复验 | `mm-review` | 每个门禁节点（强制） |

## 三角色与五门禁

| 阶段 | 角色技能 | 交付物 | 门禁 |
|---|---|---|---|
| modeling | `mm-modeling` | 题目分析报告.md、术语表格.md | M1 建模终检 |
| programming | `mm-coding` | 可运行代码、结果表、候选图（raw/process/result 各 ≥3，覆盖全部子问题）、results/复现清单.json | P1 最小可运行结果、P2 编程终检 |
| paper | `mm-paper` + `mm-word` + `mm-figure` | 完整论文.docx、正式图 ≥8 幅且覆盖全部子问题、LaTeX（可选）与 PDF | W1 证据大纲、W2 论文终检 |

门禁前置链固定为 `M1 → P1 → P2 → W1 → W2`：P1 未过不得全量计算与正式出图，P2 未过不得进入论文规划，W1 未过不得开始长篇正文与双格式排版。

## 工作目录、状态与工具

- `SKILL_ROOT`：本插件内置知识库 `assets/`，只读。所有角色细则、算法库、工具说明与外部库资料都在这里。
- `PROJECT_ROOT`：题目/项目目录，默认当前会话工作区，所有新产物写入此处。
- 状态文件：`PROJECT_ROOT/.math-modeling/state.json`，跨会话可续接。
- 工具：`mm_project_init`（初始化/续接）、`mm_state`（进度看板）、`mm_phase_enter`（进入阶段并读入角色技能全文）、`mm_todo`（阶段任务看板）、`mm_gate`（生成门禁简报 / 记录回执）、`mm_check_deliverables`（确定性交付物检查）、`mm_complete`（完成判定 + 漂移检测）、`mm_skill_read`（按需读取知识库文件）、`mm_log`（账本记录）。

每个阶段的标准任务由 `mm_phase_enter` 自动注入，用 `mm_todo list` 查看、`mm_todo check index=N` 勾选。

## 渐进式加载规则（重要）

1. 先加载本技能 → 再按「技能路由表」只加载当前阶段需要的 1–2 个技能。
2. 只有需要具体算法细节时才读 `algorithms/` 中对应的一份，不要跨族通读。
3. 需要脚本参数时读 `tools/<工具>/SKILL.md`，不要凭记忆写参数。
4. `vendor/` 下是外部库原始资料，作为深读层；每个子技能的「深读索引」已经指明该读哪一份。
5. 单轮加载超过约 3000 行的资料属于失败模式：说明没有按路由收敛。

## 算法库索引（选模型时读）

| 算法族 | 文件 | 典型用途 |
|---|---|---|
| 优化 | `algorithms/01-优化算法说明.md` | 线性/整数/非线性规划、多目标、启发式 |
| 预测 | `algorithms/02-预测类算法说明.md` | 回归、时间序列、灰色、神经网络预测 |
| 评价 | `algorithms/03-评价类算法说明.md` | AHP、熵权、TOPSIS、DEA、模糊评价 |
| 图论与网络 | `algorithms/04-图论与网络分析算法说明.md` | 最短路、最小生成树、最大流、选址与调度 |
| 统计与数据处理 | `algorithms/05-统计分析与数据处理算法说明.md` | 检验、相关、回归诊断、缺失与异常处理 |
| 综合 | `algorithms/06-综合类算法说明.md` | 微分方程、元胞自动机、排队、仿真 |
| 机器学习 | `algorithms/07-机器学习算法说明.md` | 分类、聚类、集成学习、特征工程 |

先看 `references/算法索引.md` 定位，再打开对应文件的相应小节。

## 工具链索引（执行时读）

| 需求 | 入口 |
|---|---|
| 论文 Word 生成与格式校验 | `tools/docx/SKILL.md` |
| 图表生成与质检 | `tools/figure/SKILL.md` |
| LaTeX 论文初始化与编译 | `tools/latex/SKILL.md` |
| 文献检索（双引擎） | `tools/paper_search/SKILL.md` |
| 题目 PDF 读取 | `tools/pdf/SKILL.md` |
| 附件 Excel 处理与重算 | `tools/xlsx/SKILL.md` |
| 调度与交付时间协议 | `references/Subagent调度.md`、`references/交付与截止时间协议.md` |
| 使用边界说明 | `使用指南.md` |

## 外部库深读索引

| 需求 | 相对路径 |
|---|---|
| 出版级图表规范与断言 | `vendor/nature/nature-figure/SKILL.md` |
| 统计报告与不确定度 | `vendor/nature/nature-statistics/SKILL.md`、`vendor/scientific/statistical-analysis/SKILL.md` |
| 学术写作与润色 | `vendor/academic/academic-paper/SKILL.md`、`vendor/nature/nature-writing/SKILL.md`、`vendor/nature/nature-polishing/SKILL.md` |
| 评审框架 | `vendor/nature/nature-reviewer/SKILL.md`、`vendor/academic/academic-paper-reviewer/SKILL.md` |
| 文献检索与引用 | `vendor/nature/nature-academic-search/SKILL.md`、`vendor/nature/nature-citation/SKILL.md`、`vendor/nature/nature-ref-verifier/SKILL.md` |
| 论文转 Word | `vendor/nature/nature-paper2word/SKILL.md` |
| 全库技能目录 | `vendor/scientific/catalog-skills.md` |

## 常见失败模式

| 症状 | 原因 | 处理 |
|---|---|---|
| 直接给模型，没写题目分析与假设 | 跳过建模手阶段 | 回到 M1，先补前置合同与假设表 |
| 代码跑不出结果就换成"看起来能跑"的实现 | 未区分阻塞与失败 | 保留原方案，报告依赖/数据阻塞，缩小实例验证 |
| 图很多但都不回答子问题 | 没有图表契约 | 按 `mm-figure` 建立"图表—子问题—结论"映射后再重画 |
| 论文结论无出处 | 缺 Claim-Evidence 映射 | 用 W1 门禁逐条回填公式/表/图/代码/文献 |
| 引用查无此文 | 生成式幻觉引用 | 按 `mm-search` 逐条 DOI 核验，核验不了就删除 |
| 门禁"通过"但产物已改 | 门禁后漂移未复验 | `mm_complete` 的漂移检测会拦住，需重新过门禁 |
| 摘要写成方法罗列，没有数字 | 默认写作习惯 | 按 `mm-paper` 摘要模板重写，每问必须带关键数值 |

> 来源整合：math-modeling-skill（三角色与五门禁、算法库、工具链）、scientific-agent-skills（科学计算库深读层）、academic-research-skills（写作与评审深读层）、nature-skills（图表、写作、文献、Word 深读层）；许可与出处见 `NOTICE.md`。