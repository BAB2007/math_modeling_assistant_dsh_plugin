---
name: mm-figure
description: 数模竞赛论文的出版级图表生产与质检技能——从数据剖析、图表契约、三类候选图、布局门禁到机械审计与读图复核，凡涉及画图、图表、可视化、论文配图、出版级出图时使用。
whenToUse: 需要为数学建模论文产出 raw/process/result 三类候选图与正式编号图，或复核已有成图的尺寸、中文字体、DPI、矢量格式、误差交代与色盲可读性时。
---

# mm-figure —— 出版级图表生产与质检

> 先想清楚这张图要论证什么，再决定怎么画；画完必须被机器和眼睛各过一遍。

本文件所有相对路径以技能 `assets/` 目录为根（记作 `ASSET_ROOT`）；`PROJECT_ROOT` 是参赛项目根目录（含 `data/`、`results/`、`figures/`）。命令使用路径变量，避免从任意工作目录执行时路径失效。

## 何时用 / 何时不用

| 情形 | 走向 |
|---|---|
| 论文要出正式编号图（`图 1`…`图 N`） | 本文件全流程 |
| 只有结果 CSV，不知道该画什么图 | 步骤 1–3（剖析 → 契约 → 选图） |
| 已有成图，被质疑尺寸/字号/DPI/中文方框/图例压数据 | 步骤 6–9（门禁 → 审计 → 读图 → 归档） |
| 要在 Word 缩放后仍清晰、中文不出方框 | 核心原则 1–3 + 步骤 4 |
| 需要总体/子问题建模流程图 | `tools/figure/references/chart-types/flowchart.md`，不占三类图配额 |
| 纯数据清洗、缺失值插补、统计检验本身 | 交回数据与统计流程，本技能只负责成图与图形叙事 |
| 交互式 dashboard、网页可视化面板 | 不是论文图，改用 `tools/figure/assets/可视化面板模板.html` |

## 核心原则

1. **按最终尺寸出图，不做二次缩放**：`figsize` 直接用论文实际尺寸。栏宽取 `style_constants.WIDTHS_IN`：`single`=3.5 in（88.9 mm）、`double`=7.2 in（182.9 mm）、`report`=6.3 in（160 mm）。`validate_figure.py` 的 `FINAL-WIDTH` 只在 89±4 mm 与 183±6 mm 附近判 PASS，选别的宽度要自己交代理由。
2. **矢量优先**：数据图同时产出 SVG + PDF，PNG 只作 300 DPI 预览与插图备份；JPEG 一律禁用（`figure_audit.py` 直接判 FAIL）。`svg.fonttype='none'`、`pdf.fonttype=42`，保证文字可编辑、PDF 不含 Type 3。
3. **字体与字号固定**：中文走 CJK 无衬线栈（Noto Sans CJK SC > Source Han Sans SC > Microsoft YaHei > SimHei > PingFang SC），中文期刊宋体混排用 `serif_for_zh=True`；数字、变量、单位走 Times New Roman。基准字号取自 `plot_style.apply_publication_style`：`font.size` 7.5、`axes.labelsize` 8.0、`xtick/ytick.labelsize` 7.0、`legend.fontsize` 7.0；最终尺寸下正文标签 7–9 pt、刻度 6–8 pt，5 pt 是 `validate_figure.py` 的失败线。线宽 `axes.linewidth` 0.7、`lines.linewidth` 1.1、`markersize` 3.5。
4. **误差必须被交代**：任何误差棒/阴影带/箱线，图注写清误差类型（SD / SEM / 95% CI / IQR）、样本量 n、检验方法与多重比较校正、显著性符号定义。均值柱没有误差棒等于承认没做重复。
5. **三类候选图 + 正式图双门槛**：原始数据（`raw_qN_*`）、中间过程（`process_qN_*`）、最终结果（`result_qN_*`）每类 ≥3 张、合计 ≥9 张，且每个子问题 `q1…qN` 在三类中各 ≥1 张；从中择优入文，**正式编号图 ≥8 幅且覆盖全部子问题**。建模流程图（`flow_overall_model`）必须出，但不计配额、不替代结果图。
6. **配色冗余编码**：默认 Okabe-Ito（`PALETTE.primary #0072B2`、`secondary #E69F00`、`positive #009E73`、`contrast #D55E00`、`accent #CC79A7`、`sky #56B4E9`、`neutral #6B7280`），颜色之外必须叠加线型或 marker，并导出 `_grayscale.png` 自证灰度可分；连续色阶只用 viridis / magma / inferno / cividis / RdBu_r。
7. **一图一论点、全文图型 ≥3 种**：每个面板回答一个唯一问题，遮盖某面板不削弱论证就删掉；同批数据不要用两种图表形式重复展示。9 张图全是柱状即判为图型单一。
8. **数字由代码产出**：图上标注的数值、R²、p 值、显著性星号必须来自计算结果或脚本读取，不手填、不复用别处旧数。

## 执行流程

记 `$ASSET = "<ASSET_ROOT>"`、`$PROJ = "<PROJECT_ROOT>"`，先建 `New-Item -ItemType Directory -Force "$PROJ\figures\_qa"`。

### 步骤 1 · 数据剖析
- **动作**：对每个子问题的数据单独剖析，`--group` 传真实分组列（可重复）。
- **命令**：
  ```powershell
  python "$ASSET\tools\figure\scripts\profile_data.py" "$PROJ\results\问题1_结果.csv" --group 方案 --group 工况
  python "$ASSET\tools\figure\scripts\profile_data.py" "$PROJ\results\问题1_结果.csv" --json > "$PROJ\figures\_qa\profile_q1.json"
  ```
- **产出物**：`figures/_qa/profile_qN.md`（或 `.json`）。
- **判定标准**：列类型识别正确（编号、0-1 标签被误判成数值时先 `astype(str)` 再重跑）；每组 n 已知；`skew`≥1 已决定换箱线或对数轴；`n<10` 的 WARN 已处理；`-> log axis` 提示已采纳。

### 步骤 2 · 图表契约
- **动作**：填五点契约（核心结论 / 证据链 / 版型 / 后端 / 期刊导出规范），并给每个子问题写一句带动词的结论句。
- **产出物**：`figures/_qa/contract_qN.md`，含 `a/b/c` 面板映射与"审稿人会挑战什么"清单。
- **判定标准**：核心结论是句子而非名词短语；每个面板有独立坐标系与单位；主证据占主面板，对照与鲁棒性面板更安静；三类图之间不重复叙事。细则见 `tools/figure/static/core/contract.md`。

### 步骤 3 · 选图型
- **动作**：按"数据形态 × 论证意图 × 样本量"三轴查表定图型，给 1 个首选 + 1–2 个备选；维度组合 >12 直接拆图。
- **产出物**：契约文档里的 `图型：<首选>（备选：…）` 行，以及全文图型种类清单。
- **判定标准**：n<3 直接列点；3≤n<10 用 stripplot；10≤n<30 箱线/小提琴 + 叠加散点；收敛用折线（x=迭代）、Pareto 前沿用散点、方法对比用分组柱状或点图、多指标综合评价用雷达（≤8 维）；全文图型 ≥3 种。

### 步骤 4 · 配环境与中文字体
- **动作**：先确认字体可用，再套预设。
- **命令**：
  ```powershell
  python "$ASSET\tools\figure\scripts\setup_style.py" --list-fonts
  python "$ASSET\tools\figure\scripts\setup_style.py" --test --journal general --lang zh --serif-zh
  ```
  ```python
  import sys, os
  sys.path.insert(0, os.path.join(ASSET_ROOT, "tools", "figure", "scripts"))
  from setup_style import setup_style
  from style_constants import figure_size, publication_subplots, PALETTE, COLOR_SEQUENCE
  setup_style(journal="general", lang="zh", serif_for_zh=True)   # 中文期刊；英文投稿用 journal="nature", lang="en"
  fig, axes = publication_subplots(2, 2, width="double", height_ratios=[1.4, 1.0])
  ```
- **产出物**：绘图脚本头部固定的样式调用块。
- **判定标准**：`--list-fonts` 能列出 CJK 字体；`--test` 输出里 `font.sans-serif` 含 CJK 字体、`axes.unicode_minus=False`、`svg.fonttype='none'`、`pdf.fonttype=42`、`figure.constrained_layout.use=True`。

### 步骤 5 · 生成候选图（三类命名）
- **动作**：每张候选图独立脚本块、独立导出；文件名严格为 `raw_q1_光谱原始数据`、`process_q1_迭代收敛`、`result_q1_方案对比` 这类 `前缀_qN_说明`。
- **命令**：
  ```python
  from export_figure import export_figure
  export_figure(fig, os.path.join(PROJ, "figures", "result_q1_方案对比"),
                formats=["svg", "pdf", "png"], dpi=300,
                size_inches=figure_size("single"), grayscale_preview=True)
  ```
- **产出物**：每张图 `svg + png`（+ `_grayscale.png`），成对存在。
- **判定标准**：`figsize` 等于入文尺寸；`dpi`≥300；每张图的 `qN`、类别、核心结论、图型登记进 `figures/_qa/figure_index.csv`（列：文件名、qN、类别、核心结论、图型、入文图号）。

### 步骤 6 · 布局门禁（导出前必过）
- **动作**：先理版、再打编号、最后确认几何一致。
- **命令**：
  ```python
  from layout_tools import finalize_figure, add_panel_labels
  finalize_figure(fig, prefer="constrained")     # 返回 'constrained' / 'tight' / 'none'
  add_panel_labels(fig, style="nature")          # a b c；IEEE 用 style="ieee" → (a)(b)(c)
  ```
- **产出物**：位置定稿的 Figure 对象（此时才允许导出）。
- **判定标准**：同一行面板的绘图区宽、高、外边距差 ≤1.5 pt；子图编号锚点为 `axes fraction (0,1)` 加统一 points 偏移（默认 `x_offset_pt=-20`、`y_offset_pt=2`），横看一条线、竖看一条线；colorbar/inset 不参与编号；图例不压数据；`finalize_figure` 返回 `none` 即门禁未过，改手动 `subplots_adjust` 后重跑。

### 步骤 7 · 机械审计（源码 → 图面 → 文件 → 目录）
- **动作**：四层按序跑；任一层 FAIL 回源头改，不在成品图上修补。
- **命令**：
  ```powershell
  # 1) 源码预检：字体族、可编辑文本、矢量导出、DPI、栏宽、对数轴守卫、静默抽行/删行
  python "$ASSET\tools\figure\scripts\validate_figure.py" "$PROJ\问题1_绘图.py" --strict
  # 2) 版面自检：真实检查在脚本里对 Figure 对象调用；CLI 用于 demo 或把 PDF 渲成预览（PDF 需 PyMuPDF）
  python "$ASSET\tools\figure\scripts\visual_qa.py" demo
  python "$ASSET\tools\figure\scripts\visual_qa.py" "$PROJ\figures\result_q1_方案对比.pdf" --preview "$PROJ\figures\_qa\_preview_result_q1.png" --dpi 150
  # 3) 文件合规：引号包住 glob，交给 Python 自己展开
  python "$ASSET\tools\figure\scripts\check_figure.py" "$PROJ\figures\*.svg" "$PROJ\figures\*.png" --min-dpi 300 --width-in 3.5 --height-in 2.625 --strict
  # 4) 目录级三类图与子问题覆盖（终检）
  python "$ASSET\roles\编程手\scripts\figure_audit.py" "$PROJ\figures" --questions q1 q2 q3 --min-per-category 3 --min-dpi 300 --strict
  ```
  版面自检在脚本内做：
  ```python
  from visual_qa import render_preview, audit_layout, print_report
  render_preview(fig, os.path.join(PROJ, "figures", "_qa", "_preview_q1.png"), dpi=150)
  print_report(audit_layout(fig))     # FAIL=缺字；WARN=文字越界/刻度重叠；其余仍需读图
  ```
- **产出物**：四份审计输出——validate 文本、preview PNG、check_figure verdict、figure_audit JSON。
- **判定标准**：`validate_figure --strict` 无 FAIL（`FONT-FAMILY`、`EDITABLE-TEXT`、`EXPORT-VECTOR` 要求源码出现 `Arial`/`Helvetica`/`sans-serif`、`svg.fonttype='none'`、`pdf.fonttype=42` 与 `.svg`+`.pdf` 字面量，只调 `setup_style()` 会 FAIL）；`RASTER-DPI` 300 只降为 WARN，<300 是 FAIL；`check_figure --strict` exit code 0（有 FAIL 返回 2）；`figure_audit --strict` exit code 0（有 FAIL 返回 1，逐条列出缺类、缺子问题、PNG 缺 DPI、SVG 无可编辑文本）。

### 步骤 8 · 实际读图（视觉复核，机器替代不了）
- **动作**：用读图工具打开 `_preview_qN.png` 与 `_grayscale.png`，逐项核对 8 条：乱码方框、文字裁切、图例/标注重叠、子图编号对齐、子图间距与 colorbar 侵占、配色与灰度可分、数据点/误差棒是否被裁、跨子图同色同轴同量纲。
- **产出物**：读图记录（发现项 + 回改动作）写进 `figures/_qa/visual_review.md`。
- **判定标准**：8 项全过；发现项按回改表处理——缺字回步骤 4；裁切用 `finalize_figure` + `bbox_inches='tight'`；图例压数据改 `ax.legend(bbox_to_anchor=(1.02, 1.0), frameon=False)` 或末端直接标注；刻度重叠 `ax.tick_params(axis='x', rotation=30)`；灰度糊加线型/marker。每改一处重渲一次，**最多 3 轮**；3 轮不过回步骤 3 重选图型或拆图。

### 步骤 9 · 归档命名与论文编号引用
- **动作**：定稿图落 `figures/`，源数据落 `figures/source_data/`，脚本留存；正文与图注同步编号；能进表的精确数值改走三线表。
- **产出物**：`figure_index.csv` 补齐"入文图号"，图注草稿（`图 N`），`figures/source_data/figN_*.csv`。
- **判定标准**：文件名、图号、图注一一对应且不跳号；同一数据不在图与三线表里重复展示——图给趋势与不确定性，三线表给精确值与统计量，二者在 n、误差类型、单位上口径一致；正文每幅图都有"如图 N 所示"的显式引用；复现清单能一键重跑出同一批图。

## 检查清单

- [ ] 正式编号图 ≥8 幅且覆盖全部 `q1…qN`；三类候选图各 ≥3、合计 ≥9。
- [ ] 每张图在 `figure_index.csv` 里有 qN、类别、核心结论、图型，无空列。
- [ ] `figsize` 等于入文尺寸（3.5 / 7.2 / 6.3 in），插入 Word 后未再缩放。
- [ ] 每张图成对产出 `.svg` + `.png`；PNG 内嵌 DPI ≥300；目录内无 JPEG。
- [ ] `svg.fonttype='none'`、`pdf.fonttype=42`；SVG 有 `text` 节点、无 base64 位图。
- [ ] 中文字体已命中（`setup_style(lang='zh')`），负号、`±`、`×`、`μ`、`Δ` 无方框。
- [ ] 最终打印尺寸下可读：正文标签 7–9 pt、刻度 6–8 pt、最小 ≥5 pt。
- [ ] 每个面板 x/y 轴都有"变量名 + 单位"；log 轴标注 log 与底数。
- [ ] 误差棒/阴影/箱线都在图注交代误差类型 + n + 检验 + 校正 + 符号定义。
- [ ] 无饼图、无 3D 柱/3D 饼、无双 y 轴；比例类 y 轴从 0 起或画了断裂标记。
- [ ] 连续色阶配 colorbar 且带 label；未使用 rainbow / jet / hsv。
- [ ] 灰度预览下类别仍可分；类别 >5 时改直接标注或共享图例。
- [ ] 全文图型 ≥3 种，无"同数据换图型重复展示"。
- [ ] 四层审计全绿：`validate_figure --strict`、`audit_layout`、`check_figure --strict`、`figure_audit --strict`。
- [ ] 读图 8 项逐条勾完，回改留痕，轮次 ≤3。

## 与数模三角色的衔接

| 角色/环节 | 本技能接收 | 本技能交付 |
|---|---|---|
| 建模手 | `题目分析报告.md` 里的 `q1…qN`、术语与量纲、各问结论句 | 图表契约的"核心结论"与证据链（面板映射到结论） |
| 编程手（P1 后） | 已通过最小可运行结果质检的求解代码与 `results/*.csv` | `figures/raw_qN_*`、`process_qN_*`、`result_qN_*`、`flow_overall_model`、绘图脚本、灰度预览 |
| 论文手 | `figure_index.csv`、定稿 SVG/PNG、读图记录 | `图 N` + 加粗总题 → `a/b/c` 现在时分面 → 统计口径 → 数据可用性套语；正文图表互引；三线表分工 |
| 质检 Subagent（P2） | 全部 `--questions` 参数与图目录 | `figure_audit.py --strict` 的 JSON、`check_figure` verdict、实读 PNG 记录作为证据 |

纪律：`P1` 未 PASS 不进入全量计算与正式出图；`P2` 未 PASS 不进入论文阶段。流程图与结果图两条线并行，流程图不顶替结果图。

## 深读索引

路径均相对 `assets/`；本表每条路径在写入前已用读取工具确认存在。

| 需求 | 相对路径 | 说明 |
|---|---|---|
| 端到端主链路 | `tools/figure/SKILL.md` | 9 步工作流 + 主动拦截表（双 Y 轴/饼图/n<10 均值柱） |
| 读剖析报告 | `tools/figure/references/guides/data_profiling.md` | 列类型 6 分类、n 阈值表、偏度→图型、缺失率处理 |
| 五点契约原文 | `tools/figure/static/core/contract.md` | 后端唯一性、数据完整性门禁、缺运行时的处置 |
| 多面板契约工作流 | `tools/figure/references/guides/figure_contract.md` | 核心结论→面板映射→反冗余→审稿人风险 |
| 选图决策 | `tools/figure/references/chart-types/chart_selection.md` | 决策三轴、速查表、数模场景速查、拆图判据 |
| 高级图型代码 | `tools/figure/references/chart-types/chart_types.md` | 雷达图归一化、GridSpec 布局、对数柱标注 |
| 建模流程图 | `tools/figure/references/chart-types/flowchart.md` | 总体/子问题流程图的样式、生成路线与自检 |
| 图型配方 | `tools/figure/references/api-templates/plot_recipes.md` | 每类图的完整可复制代码 + 常见坑 |
| 辅助函数与色板 | `tools/figure/references/api-templates/api.md` | `PALETTE`、布局与数值安全助手签名 |
| 端到端教程 | `tools/figure/references/guides/tutorials.md` | 分组柱状、收敛曲线、热力图、森林图演练 |
| 语义避坑 21 条 | `tools/figure/references/design/viz_pitfalls.md` | P1–P21，含锯齿折线、稀疏率图、收敛缺终止条件 |
| 形式合规清单 | `tools/figure/references/quality/publication_checklist.md` | 尺寸/格式/字体/配色/统计逐条勾选 |
| 期刊栏宽字号 | `tools/figure/references/quality/journal_specs.md` | Nature/Science/IEEE/Elsevier/PNAS/中文核心速查 |
| QA 契约与统计图注模板 | `tools/figure/references/quality/qa_contract.md` | 交付前检查表、n/误差/检验/校正最小模板 |
| 读图 8 项与回改表 | `tools/figure/references/quality/visual_review.md` | 程序自检 vs AI 读图分工、循环纪律 |
| 配色/字体/布局理论 | `tools/figure/references/design/design_theory.md` | 字号层级、线宽表、反冗余清单 §11 |
| 布局模式 | `tools/figure/references/design/common_patterns.md` | 英雄面板、专用图例面板、动态 y 轴收紧 |
| 页面原型 | `tools/figure/references/guides/nature_2026_observations.md` | 示意图主导/非对称/密集分类三类原型 |
| 图注写作 | `tools/figure/references/guides/figure_legend_conventions.md` | 图号骨架、时态、自足规则、字数上限 |
| 模板复用映射 | `tools/figure/references/guides/asset_adaptation.md` | 套用外部模板时的数据映射与改动边界 |
| 样式脚本 | `tools/figure/scripts/setup_style.py` | `setup_style(journal, lang, use_sciplots, serif_for_zh, constrained_layout)`；CLI `--list-fonts` `--test` |
| 剖析脚本 | `tools/figure/scripts/profile_data.py` | CLI `source --group`（可重复）`--json` |
| 源码预检 | `tools/figure/scripts/validate_figure.py` | CLI `--backend/--json/--strict/--self-test`，14 类检查 |
| 文件合规 | `tools/figure/scripts/check_figure.py` | CLI `paths… --min-dpi --width-in --height-in --strict`，FAIL→exit 2 |
| 导出 | `tools/figure/scripts/export_figure.py` | `formats/dpi/size_inches/grayscale_preview/tight/pad_inches` |
| 版面自检 | `tools/figure/scripts/visual_qa.py` | `render_preview/audit_layout/print_report`；CLI 仅 `demo` 与 `--preview` |
| 对齐与理版 | `tools/figure/scripts/layout_tools.py` | `add_panel_labels(style=…)`、`finalize_figure(prefer=…)` |
| 常量与尺寸 | `tools/figure/scripts/style_constants.py` | `PALETTE/COLOR_SEQUENCE/WIDTHS_IN/figure_size/publication_subplots` |
| 目录级门禁 | `roles/编程手/scripts/figure_audit.py` | CLI `figures_dir --questions q1…qN --min-per-category --min-dpi --strict`，FAIL→exit 1 |
| 编程手可视化链 | `roles/编程手/references/工作流程.md` | 第五节：三类图要求、命名规范、P1/P2 门禁 |
| 旧版样式兼容层 | `roles/编程手/scripts/plot_style.py` | `apply_publication_style/audit_design/audit_layout/export_figure` 基准字号来源 |
| MATLAB 出版绘图 | `roles/编程手/scripts/apply_publication_style.m` | `apply_publication_style(fig, language, widthProfile)` |
| MATLAB 导出与审计 | `roles/编程手/scripts/export_publication_figure.m`、`roles/编程手/scripts/audit_publication_figure.m` | `export_publication_figure(fig, outputStem, dpi, grayscalePreview, strictDesign)`、`audit_publication_figure(fig)` |
| MATLAB 规范与质检 | `roles/编程手/references/MATLAB规范.md`、`roles/编程手/references/质检清单.md` | 图形对象属性约定、逐项验收口径 |
| nature-figure 路由 | `vendor/nature/nature-figure/SKILL.md` | 后端门禁、多面板对齐 1.5 pt 允差、碰撞审计流程 |
| Nature 旗舰要求 | `vendor/nature/nature-figure/references/nature-article-requirements.md` | 初评与接收后两阶段的图数、图注上限 |
| 多面板证据架构 | `vendor/nature/nature-figure/references/multipanel-evidence-architecture.md` | 面板承担不同推断角色、主图准入判据 |
| 诚实编码与可访问性 | `vendor/scientific/scientific-visualization/SKILL.md` | 零基线、面积/体积、缺失与截断的披露规则 |
| 欺骗性编码清单 | `vendor/scientific/scientific-visualization/references/publication_guidelines.md` | 双轴、截断、选择性增强的判定 |
| 配色语义与对比度 | `vendor/scientific/scientific-visualization/references/color_palettes.md` | Okabe-Ito/Paul Tol 具体值、WCAG 对比度、灰度局限 |
| Matplotlib 细节 | `vendor/scientific/matplotlib/SKILL.md` | OO API、`layout="constrained"`、savefig 与 DPI 关系 |
| Seaborn 统计默认值 | `vendor/scientific/seaborn/SKILL.md` | `errorbar` 新 API、`units` 个体轨迹、缺失值桥接陷阱 |

## 常见失败模式

| 症状 | 原因 | 处理 |
|---|---|---|
| 两个量纲不同的量画在一张图上，左右轴一对齐就"强相关" | 双 y 轴尺度可任意调，视觉相关是作图者造的 | 拆成上下两子图共享 x；或改散点（x=var1、y=var2）；或标准化到 [0,1] 后共轴 |
| 占比用饼图或 3D 饼，读者读不出大小 | 人眼判长度比判角度准约 3 倍，3D 视角还扭曲数值 | 换按值排序的横向柱状；总量分解用堆叠柱；三维数据改 2D 热力图 + colorbar |
| 柱状图 y 轴从 90 起，2% 差异看起来像翻倍 | 截断坐标轴放大微小差异 | 比例/概率类从 0 起；跨量级改 log 轴；必须截断就画断裂标记并在图注说明 |
| 红绿两组，色盲读者看到两条一样的灰线 | 只用颜色编码且选了红绿对 | 换 Okabe-Ito + 线型/marker 双编码；`grayscale_preview=True` 验收灰度可分 |
| 三组各 5 个样本画成均值柱，审稿人怀疑藏数据 | 均值柱掩盖分布、偏态、离群点与 n | n<10 直接 stripplot／dot plot；10≤n<30 箱线 + 叠加散点；任何柱状都配误差棒 |
| 图例压住一簇数据点，标注叠成黑块 | 依赖 `loc='best'` 自动放置，且没做读图复核 | `bbox_to_anchor=(1.02, 1.0), frameon=False` 移到图外，或末端直接标注替掉图例；标注只留关键几个 |
| Word 里一缩放，字号掉到 5 pt、线糊成一团 | 按屏幕尺寸出图，入文时二次缩放 | `figsize` 直接等于入文尺寸，导出再用 `size_inches` 钉一次，插入 Word 不缩放 |
| 中文变方框、负号变豆腐块 | 默认字体无 CJK 字形，或字体缺 U+2212 | `setup_style(lang='zh')`；`--list-fonts` 确认命中；`axes.unicode_minus=False`；导出前 `audit_layout` 兜底 |
| PNG 是截图质感、放大即糊 | 用截图或低 dpi 位图交稿 | 重跑 `export_figure(..., dpi=300, formats=["svg","pdf","png"])`；数据图主交付是 SVG |
| `figure_audit --strict` 报某类候选图不足 3 张或缺子问题 | 命名未按 `前缀_qN_说明`，或只做了结果图 | 按规范重命名并与脚本对齐；补齐 `raw_`／`process_`；`--questions q1 q2 qN` 传全部子问题 |
| `check_figure --strict` 报 PNG 低于 300 DPI 或 SVG 无 `text` 节点 | 截图当图，或 `svg.fonttype='path'` 把文字转成了曲线 | 重新导出并确认 `svg.fonttype='none'`；在 SVG 里用编辑器查看文字是否仍可选 |
| `validate_figure --strict` 在 FONT-FAMILY／EDITABLE-TEXT／EXPORT-VECTOR 上 FAIL | 只调了 `setup_style()`，源码里没有对应字面量 | 在绘图脚本里显式写 `rcParams` 与导出名（`Arial`、`svg.fonttype='none'`、`pdf.fonttype=42`、`.svg`/`.pdf`） |

> 来源整合：math-modeling-skill（tools/figure）、nature-skills（nature-figure）、scientific-agent-skills（scientific-visualization、matplotlib、seaborn）；许可见 assets/NOTICE.md。