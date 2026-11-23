# NOTICE — 来源、许可与整合说明

本插件（`dsh-math-modeling`）不是从零写作的原创作品，而是把下列四个开源仓库的内容**整合**成一套面向数学建模竞赛的 DSH 技能与工作流。
本文件用于标明来源、许可与改写范围。分发或再发布前请自行复核每个来源的许可条款。

## 1. math-modeling-skill

- 仓库：https://github.com/XiaoMaColtAI/math-modeling-skill
- 作者：XiaoMaColtAI
- 许可：仓库根目录**未提供 LICENSE 文件**（默认版权保留）。本插件在本地使用场景下整合其技能文本、算法说明、角色规范与脚本；如需对外分发，请先取得作者授权或替换为自写内容。
- 整合范围（复制到 `assets/`）：
  - `references/` → `assets/references/`（算法索引、Subagent 调度、交付与截止时间协议）
  - `references/roles/*/references|scripts` → `assets/roles/<角色>/`（三角色细则与环境检查、绘图、复现脚本）
  - `assets/*.md`（7 类算法说明）→ `assets/algorithms/`
  - `tools/{docx,figure,latex,paper_search,pdf,xlsx}` → `assets/tools/`（含可执行脚本与模板）
  - 根 `SKILL.md`、`使用指南.md` 的协议与边界要求 → 重写为 `assets/SKILL.md` 与 `assets/skills/*/SKILL.md`
- 改写：路由层、九个子技能正文、系统提示协议、`mm_*` 工具描述均为本次整合改写；原算法说明、角色细则与工具脚本保持原文（仅调整个别路径约定）。

## 2. scientific-agent-skills（K-Dense）

- 仓库：https://github.com/K-Dense-AI/scientific-agent-skills
- 许可：MIT（`LICENSE.md`，Copyright (c) 2025 K-Dense Inc.）
- 整合范围（`assets/vendor/scientific/`，保留 SKILL.md 与 references）：
  `statistical-analysis`、`scientific-visualization`、`matplotlib`、`seaborn`、`scikit-learn`、`statsmodels`、`sympy`、
  `networkx`、`pymoo`、`simpy`、`exploratory-data-analysis`、`uncertainty-and-units`、`aeon`、`paper-lookup`、
  `scientific-writing`、`peer-review`；另收录全库目录 `catalog-skills.md`。
- 改写：新增 `mm-science` / `mm-stats` / `mm-figure` 等技能对其做"数模场景 → 库 → API"的映射；原技能文件保持原文。

## 3. academic-research-skills

- 仓库：https://github.com/Imbad0202/academic-research-skills
- 许可：CC BY-NC 4.0（Copyright (c) 2026 Cheng-I Wu）——**禁止商业用途**，需署名。
- 整合范围（`assets/vendor/academic/`，保留 SKILL.md、references、templates）：
  `academic-paper`、`academic-paper-reviewer`、`deep-research`、`academic-pipeline`。
- 改写：其论文写作与评审框架被压缩进 `mm-paper` / `mm-review` 的可执行流程；原文件保持原文，供深读。

## 4. nature-skills

- 仓库：https://github.com/Yuan1z0825/nature-skills
- 许可：Apache License 2.0
- 整合范围（`assets/vendor/nature/`，保留 SKILL.md、references、static）：
  `nature-figure`、`nature-writing`、`nature-statistics`、`nature-citation`、`nature-academic-search`、
  `nature-reviewer`、`nature-paper2word`、`nature-polishing`、`nature-ref-verifier`、`nature-paper-card`、
  `nature-literature-pipeline`。
- 改写：其图表规范、写作规范、引用核验与 Word 转换流程被压缩进 `mm-figure` / `mm-paper` / `mm-search` / `mm-word`；原文件保持原文。

## 使用约束

- 本插件把 CC BY-NC 内容（来源 3）与未声明许可内容（来源 1）一并打包，因此**整包不构成可直接商业再分发的成果**；对外分发请逐项替换或取得授权。
- 插件代码（`lib/`、`cordis.patch.yml`、`package.json`、`locale/`、`icon.svg`）与本次撰写的九个技能正文由本仓库作者提供，按 MIT 发布。
- 所有来源的技能文本均按"参考资料"引用，不改变其许可归属；引用片段未逐条标注页码，深读时以 `assets/vendor/` 下的原文为准。