---
name: mm-word
description: 数模论文 Word/LaTeX 产物生成与格式合规校验，覆盖生成 Word、LaTeX 编译与排版、格式硬项检查、原生 OMML 公式、三线表、PDF 产出校验与双格式一致性核对。
whenToUse: 当需要把已完成的数模论文稿导出为可提交的 DOCX 或 PDF，并在交付前过格式与结构门禁时使用。
---

# mm-word —— 论文 Word / LaTeX 产物与格式合规

`$A` = 本插件 assets 根目录（`SKILL_ROOT`，只读）；`$P` = 用户 `PROJECT_ROOT`。脚本只写 `$P`，产物不回写 assets，官方模板先复制再改。

## 何时用 / 何时不用
用：
- 正文、图、表、代码已就绪，要产出 `$P/完整论文.docx` 或 `$P/完整论文.pdf`。
- 要核对格式硬项：页面、字体行距、标题层级、三线表、题注、公式、页码、附录代码。
- 要把 Markdown 或完整 LaTeX 项目转成带原生公式的 DOCX，并留下转换清单。
- 要判断「导出是否真的完成」：要可复现的退出码，而不是「文件生成了」；要做 Word 与 LaTeX 双格式一致性核对。

不用：
- 还在读题、建模、写假设 → 建模手技能；正文与摘要写作 → 论文手写作技能。
- 要出图或改图 → 图表工具与编程手；本技能只做嵌入、编号、引用核对。
- 要检索文献或核验条目 → 文献检索/引用工具；本技能只查引用与文献表双向对应。只想看排版建议而不需可提交文件时，直接读格式规范即可。

## 核心原则
1. **模板优先**：当届官方模板 > 当届官方规则 > 内置 `cumcm`/`mcm-icm` 基线；基线不是永久规则。
2. **一切可编辑**：公式必须 OMML，表格必须真表格，图片必须真实图像文件；不接受图片公式、文本框拼版、LaTeX 源码当公式。
3. **链路先通**：内容未写完也先用最小真实样例走通「代码 → 结果表/图 → 论文源文件 → DOCX/PDF → 打开检查」，尽早拿到可提交的 V1 再迭代。
4. **退出码即结论**：门禁非 0 就是未完成，预警也算失败；放宽必须带精确白名单和书面理由。
5. **清单不可伪造**：`.conversion.json`、`.build.json`、`latex-project.json` 必须与当前产物哈希一致。
6. **只写 `$P`**：不覆盖官方模板与输入附件；不交付脱离 `.cls/.sty/.bib` 的单文件 `.tex`。

## Word 路线
### 1. 环境与模板体检
```powershell
python "$A/tools/docx/scripts/check_env.py"          # 期望 0；缺 pandoc 只影响整篇转换
python "$A/tools/docx/scripts/inspect_template_format.py" "$P/当届官方模板.docx" -o "$P/模板体检.json"
```

体检 JSON 给出 `page`（宽高、四边距、页眉页脚距、`docGrid`）、`themeFonts`、`commonRunSizes`、`roleSamples`（题名/摘要/正文/关键词/各级标题的真实字号与行距）、`tables`（三线表顶底边与内部线）。以它为准，不用记忆值。内置 `roles/论文手/references/论文模板.docx` 实测：页 11906×16838 dxa（A4）、四边距 1440/1440/1800/1800 dxa（上下 2.54 cm、左右 3.18 cm）、正文 12 pt/行距 1.25/首行缩进 480 dxa、一级标题 16 pt 加粗居中、三线表顶底 `sz=12` 且无竖线。

### 2. 生成正文
```python
from pathlib import Path
import sys
sys.path.insert(0, str(Path("<assets>") / "tools" / "docx" / "scripts"))
import paper_format as pf

doc = pf.new_document(contest="cumcm", template_path=Path("<PROJECT_ROOT>/当届官方模板.docx"),
                      preserve_template_content=False)   # 模板含固定摘要页时改 True 并在原位填充
pf.title(doc, "论文题目")                                  # 黑体 14 pt 居中
pf.abstract_title(doc)                                     # "摘 要"，CUMCM 必需结构项
pf.body(doc, "摘要正文。")                                  # 宋体 12 pt、行距 1.25、首行缩进 24 pt
pf.keywords(doc, "优化；预测")                              # 必需结构项 "关键词："
pf.heading1(doc, "一、问题重述")                            # 16 pt 加粗居中 + 段前分页
pf.heading2(doc, "1.1 问题背景")                            # 14 pt 非加粗
pf.heading3(doc, "1.1.1 数据来源")                          # 12 pt 加粗
pf.equation(doc, r"\min f(x)=\sum_{i=1}^{n}x_i^2")          # 居中 OMML，不含编号
pf.image(doc, "<PROJECT_ROOT>/figures/result/q1_trend.png", width_cm=12)
pf.figure_caption(doc, "图1 需求随时间的演化")               # 10 pt 居中，题注段须以「图N」开头
pf.three_line_table(doc, [["符号", "说明", "单位"], ["x", "决策变量", "-"]])
pf.save_document(doc, Path("<PROJECT_ROOT>"), filename="完整论文.docx",
                 contest="cumcm", overwrite=False)         # 写入前跑结构校验并原子替换
```

`heading2()` 写 14 pt，内置模板样本的二级标题是 12 pt/行距 1.5：以官方模板为准，需完全贴合时用模板样式或显式设字号后重跑体检。MCM/ICM 结构项要求正文有文字恰为 `Summary` 的段落，`paper_format` 无对应助手，用 `pf.title(doc, "Summary")` 之类显式写入。

### 3. 国赛 Word 格式硬项对照
| 硬项 | 脚本行为 / 要求 | 核对方式 |
|---|---|---|
| 页面与页边距 | `setup_page`：A4 21×29.7 cm，cumcm 上下 2.54 / 左右 3.18；mcm-icm 为 LETTER、四边 2.54；传模板时沿用模板 `sectPr` | 体检 `page` 与成品解包 `w:pgMar` 一致 |
| 正文字体字号行距 | 宋体 12 pt（西文 Times New Roman）、行距 1.25、首行缩进 24 pt、段前段后 0 | 体检 `roleSamples.bodyParagraph`；抽页目视 |
| 标题层级 | 题名 黑体 14；一级 16 加粗居中且段前分页；二级 14 非加粗；三级 12 加粗 | 体检 `level1Heading`/`level2Heading`；`self_check.py` 断言分页与二级字号 |
| 三线表 | 顶/底 `w:sz=12`（1.5 pt），栏目行下 `w:sz=4`（0.5 pt），左右与内部竖线 `nil`，全表居中 | 体检 `tables.borders`；解包查 `w:tblBorders` |
| 图表题注 | 图题在下、表题在上，均 10 pt 居中；题注段必须以「图N」「表N」开头 | `paper_format.py validate` 的编号检查 |
| 公式 | 居中 `m:oMathPara`；`\tag{1}` 只生成 "(1)" 文本随公式居中，**不右对齐** | `metrics.equations` 计数 + 解包查 `m:oMath` |
| 页码与页眉 | 脚本不生成页眉页脚，由官方模板 `sectPr` 继承或在 Word 补设 | 体检 `headerDxa`/`footerDxa`；PDF 抽页核对页码 |
| 附录代码 | 等宽字体 10 pt、行距 1.0、不首行缩进（无代码助手，需显式设定） | 附录抽页目视，确认无截断 |

### 4. 公式：原生 OMML 与书写约定
```powershell
python "$A/tools/docx/scripts/equations.py" replace "$P/完整论文.docx" `
  --replace "EQ_OBJECTIVE" "\min f(x)=\sum_{i=1}^{n}x_i^2" --output "$P/完整论文.docx"
python "$A/tools/docx/scripts/equations.py" replace "$P/完整论文.docx" --replace "EQ_X" "x_i^2" --show-omml
```

- 支持分式、上下标、根式与 n 次根、希腊字母与关系符号、反三角、`matrix/pmatrix/bmatrix/Bmatrix/vmatrix/Vmatrix/aligned/cases`；未知命令、未闭合分组、不支持环境直接报错，不会静默降级成文本。
- **多行对齐**：`aligned`/`cases` 按 `\\` 分行、`&` 分列，每行列数必须一致，否则报错；OMML 侧是矩阵格而不是真对齐。列数不齐就拆成多个 `pf.equation()` 段落分别编号。
- **编号方式**：Word 给公式段落设「居中制表位 + 右对齐制表位」，编号手写在右制表位；编号与正文「式(1)」引用逐一对齐。脚本不自动编号，别指望 `\tag` 变成右对齐编号。
- **符号表一致**：符号说明表与公式用同一 LaTeX 源生成（统一 `\nu`，不要一处 `\nu` 一处 `v`），单位列与结果表一致。
- **禁图片公式的判据**：`metrics.equations` 只数 `m:oMath`；若 `equations` 不增而 `figures` 增加，说明公式被当图片插入了。

```powershell
python -c "import sys,zipfile; x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8'); print('oMath=', x.count('<m:oMath'))" "$P/完整论文.docx"
```

### 5. 图片嵌入规范
- 位图 ≥ 300 DPI（编程手导图默认 300），矢量优先：曲线/示意图导 PDF 或同源 PNG；LaTeX 安全编译链只吃 PDF/PNG/JPG，不依赖 SVG/EPS 转换。
- 宽度不超版心：A4 左右 3.18 cm 时版心约 14.6 cm，`pf.image` 默认 12 cm；一图一语义、编号连续，题注与正文引用一致。
- 图必须来自真实运行结果；`a:blip` 计数即 `metrics.figures`。

### 6. Markdown / LaTeX 转 DOCX
```powershell
python "$A/tools/docx/scripts/equations.py" generate "$P/论文.md" --output "$P/论文.docx" `
  --template "$P/当届官方模板.docx" --timeout 120
python "$A/tools/docx/scripts/equations.py" convert-latex "$P/完整论文-LaTeX/main.tex" `
  --output "$P/完整论文.docx" --template "$P/当届官方模板.docx" --timeout 120 --overwrite
python "$A/tools/docx/scripts/equations.py" verify-conversion "$P/完整论文.docx"
```

Pandoc 警告默认阻断发布，失败成对回滚；`--allow-warning` 必须配 `--override-reason`。成功生成 `.conversion.json`，记录输入/输出/模板哈希、Pandoc 版本与命令；源码、子文件、图片、`.bib`、模板任一变化都要重转并复验。转换不替代结构校验与渲染抽检。

### 7. 真页数与渲染取图
```powershell
soffice --headless --convert-to pdf --outdir "$P/render" "$P/完整论文.docx"   # 无 LibreOffice 时用 Word 另存
python -c "from pypdf import PdfReader; import sys; print(len(PdfReader(sys.argv[1]).pages))" "$P/render/完整论文.pdf"
pdftoppm -png -r 110 "$P/render/完整论文.pdf" "$P/render/page"
```

页数只能来自真实渲染，字符估算无效。抽检固定看：摘要页、首个公式页、最宽表格页、图片密集页、参考文献页、附录首页。

### 8. 确定性门禁（任一非 0 即未完成）
| 环节 | 命令 | 期望 |
|---|---|---|
| 环境 | `python "$A/tools/docx/scripts/check_env.py"` | 0 |
| 工具自检 | `python "$A/tools/docx/scripts/self_check.py"` | 0 |
| OOXML 结构 | `python "$A/tools/docx/scripts/office/validate.py" "$P/完整论文.docx"` | 0 |
| 结构+质量+编号+文献+页数 | `python "$A/tools/docx/scripts/paper_format.py" validate "$P/完整论文.docx" --contest cumcm --rendered-pages 22` | 0 |
| 转换清单 | `python "$A/tools/docx/scripts/equations.py" verify-conversion "$P/完整论文.docx"` | 0（仅 Pandoc 路线） |

`paper_format.py validate` 输出 JSON 的 `metrics`（`content_units`/`equations`/`figures`/`tables`）与 `issues`；任一 issue（含「预警：」）即 `passed=false`、退出码 1。`self_check.py` 会调用 `office/validate.py`，`office/` 下的 `validate.py`/`unpack.py` 都依赖 `defusedxml`，缺包时先在导入处退出 1，先补依赖再判文档有问题。

## LaTeX 路线
### 1. 诊断引擎
```powershell
python "$A/tools/latex/scripts/latex_paper.py" doctor --engine xelatex --bibliography-backend bibtex --need-pandoc
```

默认 XeLaTeX 且不启用 shell escape；官方模板要求时改 `--engine lualatex|pdflatex`。含 `.bib` 必须有 `latexmk`，否则编译拒绝。`passed=false`（退出码 1）先补环境，别写完全文才发现编不了。

### 2. 初始化
```powershell
python "$A/tools/latex/scripts/latex_paper.py" init "$P/完整论文-LaTeX" `
  --contest cumcm --template "$P/当届官方LaTeX模板" --main "src/paper.tex" `
  --template-source "<官方模板页面URL>" --template-version "<适用届次>"
```

无官方模板时省略 `--template`/`--main`/元数据，用 `assets/templates/cumcm/` 或 `mcm-icm/` 基线（`ctexart`/`article` + `amsmath` + `booktabs` + `geometry`）。CUMCM、MCM/ICM 之外必须 `--contest generic` 并提供官方模板；输出目录已存在则拒绝覆盖。`latex-project.json` 记录主入口、模板哈希与资源绑定，不可手改。

### 3. 绑定资源与编译
```powershell
python "$A/tools/latex/scripts/latex_paper.py" bind "$P/完整论文-LaTeX/main.tex" "$P/figures" "figs"
python "$A/tools/latex/scripts/latex_paper.py" bind "$P/完整论文-LaTeX/main.tex" "$P/code" "code"
python "$A/tools/latex/scripts/latex_paper.py" build "$P/完整论文-LaTeX/main.tex" `
  --engine xelatex --timeout 180 --publish "$P/完整论文.pdf"
```

`--publish` 只能落在项目目录的直接父目录；已存在拒绝覆盖，确认替换才加 `--overwrite`。中间产物固定在项目 `build/`（唯一允许的 `--output-dir`）。未解析引用、宏包预警、Overfull/Underfull box 默认阻断；确有依据才用 `--allow-warning "<精确正则>" --override-reason "<理由>"`。**发布产物（PDF + 同名 `.build.json`）只在门禁通过时落盘**；失败时 `build/` 里的中间 PDF 与 `passed=false` 清单只用于诊断，不能当交付物。

### 4. 校验源码与 PDF
```powershell
python "$A/tools/latex/scripts/latex_paper.py" validate "$P/完整论文-LaTeX/main.tex" `
  --pdf "$P/完整论文.pdf" --contest cumcm --quality-checks `
  --questions q1 q2 q3 --min-image-dpi 300 --max-pages 30 --body-start-page 2
```

校验覆盖：摘要与关键词、模板占位符（`LATEX_TEMPLATE_*`、`TODO`、`待补充`）、行间公式成对、图表题注/内容/label/正文引用、`fig:q1-*` 子问题图覆盖、`\cite` 与 `.bib` 对应、手工文献是否被引用、PDF 与源码哈希绑定、空白页、页面尺寸、字体嵌入、位图 DPI。`--body-start-page`/`--appendix-start-page` 仅 CUMCM 可用，且附录参数要求源码真有 `\appendix` 或 `appendices`；`mcm-icm`/`generic` 的 `--max-pages` 按 PDF 总页数校验。降门槛必须 `--override-reason`；`--no-require-pdf` 的报告不能用于最终交付。

### 5. PDF 产出校验
```powershell
python -c "from pathlib import Path; import sys; d=Path(sys.argv[1]).read_bytes()[:5]; print(d); sys.exit(0 if d==b'%PDF-' else 1)" "$P/完整论文.pdf"
python -c "from pypdf import PdfReader; import sys; print(len(PdfReader(sys.argv[1]).pages))" "$P/完整论文.pdf"
pdftoppm -png -r 110 "$P/完整论文.pdf" "$P/render/pdf-page"
```

页数为 0、头部不是 `%PDF-`、渲染出空白页或裁切，都按未完成处理。

## 双格式一致性核对
两份产物都过门禁后逐项对照；不一致就回源头改，不要只改一侧：

| 核对项 | Word 侧证据 | LaTeX/PDF 侧证据 |
|---|---|---|
| 章节顺序与标题文字 | `validate` 的正文文本与页序 | PDF 抽页与源码 `\section` |
| 图表数量 | `metrics.figures` / `metrics.tables` | `validate` 的 `metrics.figures`/`metrics.tables` |
| 公式数量 | `metrics.equations` | `metrics.equations`（`_display_equations`） |
| 图表编号与引用 | 编号检查（缺题注/未引用/无对应对象） | 孤儿图/孤儿表与重复 label 报错 |
| 关键数值与单位 | 结果表与结论段 | 同段数值与表内数值 |
| 参考文献 | `[n]` 双向对应 | `\cite` 与 `.bib`/`\bibitem` 对应 |
| 页数与正文页数 | `--rendered-pages` 与官方上限 | `rendered_pages`/`body_pages`（CUMCM 按正文口径） |
| 哈希与清单 | `.conversion.json` 复验通过 | `.build.json` 的 `passed=true` 且源码哈希一致 |

## 检查清单
- [ ] 官方模板与届次已核验，模板体检 JSON 已生成并对照。
- [ ] 页面尺寸、四边距、正文字体字号行距缩进、标题层级与段前分页均与模板一致。
- [ ] 三线表顶/底 1.5 pt、栏目线 0.5 pt、无竖线、全表居中。
- [ ] 图题在下、表题在上，编号连续且正文至少引用一次。
- [ ] 公式全为 `m:oMath`，无图片公式；编号右对齐且与正文引用一致。
- [ ] 符号表符号与公式、结果表单位一致；图片 ≥300 DPI 且不超版心。
- [ ] 页码页眉从模板继承，渲染 PDF 中连续、无残留；附录代码等宽 10 pt、行距 1.0。
- [ ] 正文无 Markdown 残留（`**`、反引号、`#`、`$`、表格竖线）与 `[待补充]`。
- [ ] 正文无内部流程词（门禁、质检、回执、subagent）；DOCX 四道门禁与 LaTeX `validate` 全部退出码 0，渲染抽检留图。
- [ ] `.conversion.json`/`.build.json`/`latex-project.json` 与当前产物一致，V1 备份未被覆盖。

## 与数模三角色的衔接
- **上游输入**：建模手给符号表与公式源；编程手给 ≥300 DPI 正式图、结果表、代码清单；论文手给成稿正文与摘要。缺料先要料，不先排版。
- **分工边界**：出图与图质检归图表工具和编程手；本技能只管嵌入、编号、引用与版式，不重画图、不改数据。
- **下游交付**：把两份 `validate` 的 JSON、编译/转换清单、渲染抽检页交给论文终检环节作可复现证据；本技能不替代终检结论。
- **术语与时间纪律**：门禁/质检/回执等流程词不得进正文（会被判污染）；临近内容冻结只在副本上做格式实验，失败导出不得覆盖已验证的 V1。

## 深读索引
路径均相对 `assets/`。

| 路径 | 用途 |
|---|---|
| `tools/docx/SKILL.md` | DOCX 工具总流程、校验与修订/批注入口 |
| `tools/docx/scripts/paper_format.py` | 格式常量、构建 API、`validate` 门禁实现 |
| `tools/docx/scripts/equations.py` | LaTeX→OMML、`replace`/`generate`/`convert-latex`/`verify-conversion` |
| `tools/docx/scripts/inspect_template_format.py` | 模板页面/字体/角色/表格体检 |
| `tools/docx/scripts/self_check.py` | 一条命令自检（公式/三线表/模板校验） |
| `tools/docx/scripts/check_env.py` | python-docx、lxml、pandoc 依赖检查 |
| `tools/docx/scripts/office/validate.py` | OOXML XSD 校验与 `--auto-repair` |
| `tools/docx/scripts/office/unpack.py` | 解包到 `word/document.xml` 做定点核查（需 defusedxml） |
| `tools/latex/SKILL.md` | LaTeX 工具总流程与门禁口径 |
| `tools/latex/scripts/latex_paper.py` | `doctor/init/bind/build/validate` 实现 |
| `tools/latex/assets/templates/cumcm/main.tex` | 国赛基线模板（ctexart） |
| `tools/latex/assets/templates/mcm-icm/main.tex` | 美赛基线模板（article） |
| `roles/论文手/references/论文格式规范.md` | Word 格式规范与校验流程 |
| `roles/论文手/references/LaTeX格式规范.md` | LaTeX 模板、编译与交付要求 |
| `roles/论文手/references/论文模板.docx` | 内置参考模板，可做体检基线 |
| `roles/编程手/scripts/figure_audit.py` | 图 DPI/SVG/分类覆盖审计（`--strict` 非 0 判失败） |
| `vendor/nature/nature-paper2word/SKILL.md` | Markdown→DOCX 的契约、门禁与退出码语义 |
| `vendor/nature/nature-paper2word/references/format-requirements.md` | 格式要求如何提取并落表 |
| `vendor/nature/nature-paper2word/references/reference-layout.md` | 按参考论文反推版式 |
| `references/交付与截止时间协议.md` | 尽早跑通链路与可提交版本 |

## 常见失败模式
| 症状 | 原因 | 处理 |
|---|---|---|
| `equations` 计数为 0 或远低于预期 | 公式是截图/文本框/纯文本 LaTeX | 用 `pf.equation()` 或 `equations.py replace` 重写为 OMML |
| 公式编号错位或缺失 | 依赖 `\tag{1}` 期望右对齐 | 设居中+右对齐制表位，手写编号并核对引用 |
| 三线表有竖线或粗黑框 | 套用了 Word 内置表格样式 | 用 `three_line_table()`，或按 `w:sz=12/4` 改 `tblBorders` |
| `图N 已插入但未在正文引用` | 有题注无正文引用 | 正文补「如图N所示」，或删掉无引用的图 |
| `疑似 Markdown 格式残留` | 草稿标记直接粘进 DOCX | 清洗 `**`、反引号、`#`、`$`、表格竖线后重新导出 |
| `疑似内部流程术语残留` | 门禁/质检/回执写进正文 | 正文只留论文语言，流程词留在账本 |
| `--rendered-pages` 用了估算值 | 未真实渲染 | 先转 PDF 取页数，再跑 `paper_format.py validate` |
| `office/validate.py` 导入即失败 | 缺 `defusedxml` | 补依赖后重跑，别当成文档有错 |
| LaTeX 因缺 `latexmk` 中止 | 含 `.bib` 却无 `latexmk` | 装 `latexmk`，不要手工 `bibtex` 绕过 |
| `发布产物已存在，拒绝覆盖` | 未加 `--overwrite` | 确认旧版可替换后加参数，并保留旧 PDF 备份 |

> 来源整合：math-modeling-skill（tools/docx、tools/latex、roles/论文手格式规范）、nature-skills（nature-paper2word）；许可见 assets/NOTICE.md。
