---
name: mm-search
description: 数模文献检索、引用核验与参考文献管理技能，用于找文献、检索方法出处与参数来源、核验 DOI 与出版信息，并按 GB/T 7714、APA 7 或 BibTeX 生成、去重、导出参考文献。
whenToUse: 当题目需要理论依据、方法出处、参数取值来源或数据来源说明，或需要核验、格式化、管理参考文献时使用。
---

# mm-search —— 数模文献检索、引用核验与参考文献管理

把「这句话想引个出处」变成「一条可核验、可导出、可复现的文献记录」。默认执行器是
`tools/paper_search/scripts/hybrid_scholar.py`（OpenAlex + AnySearch 并行召回 + DOI 交叉验证）。

## 何时用 / 何时不用

| 该检索（真有出处需求） | 最低交付 |
|---|---|
| 理论依据：你用的模型/定理在文献中的原始形式与适用条件 | 1 条可解析 DOI 的原始文献，正文标出「在 X 假设下」 |
| 方法出处：改进的算法、对比的基线、评价方法的来源 | 基线方法各 1 条，改进点 1–2 条 |
| 参数取值来源：β/γ、权重、阈值、弹性系数等来自文献或实测 | 每条参数标「文献值 / 数据反演 / 假设值」，文献值给 DOI |
| 数据来源说明：公开数据集的权威出处与版本 | 数据集 DOI（Zenodo/Figshare）或官方页面 + 访问日期 |
| 结论对照：与已有研究的数值结论比较 | 2–3 条同场景文献，且读了摘要/结果段 |

| 不该检索（凑引用会被扣分） | 处理方式 |
|---|---|
| 常识性方法：线性规划标准形、最小二乘推导、GM(1,1) 三步建模、AHP 一致性检验步骤 | 直接写公式与步骤，不挂引用；要引也只引教材并说明是标准流程 |
| 你自己推导的引理、你自己定义的指标 | 写明「本文定义」，不必引用 |
| 纯计算结果、求解器输出、代码得到的数值 | 引用代码/复现清单，不引文献 |
| 题目给定的附件数据 | 写「数据来源：赛题附件 X」，不引文献 |

判定线：写不出「谁在什么条件下用过这个式子/这个参数」时，不要引。全文引用量以 12–25 条
为宜（以当届官方模板为准），数量不构成质量。

## 核心原则

1. **先有句子，再有引用**。每条引用必须写明它支撑正文哪一句；支撑不了的引用删掉。
2. **检索结果只是候选**。只有通过核验（DOI/出版方页面可解析、字段一致）的条目才叫文献。
3. **双引擎默认全开**。`--openalex-only` / `--anysearch-only` 只用于诊断单源故障，不得据此宣称「无人研究」。
4. **相关性优先于引用量**。引用量是排序辅助，不是正确性、也不是支持力度的证据。
5. **不编造字段**。缺卷期页就留空并标注「未核验」，不写「等」「et al.」掩盖缺失作者。
6. **可复现**。记录查询式、数据源、日期、命中数与去重前后数量，别人能重跑。
7. **中文文献走人工通道**。CNKI/万方无程序化接口，Crossref 返回空 ≠ 中文没人做。

## 执行流程

**Step 0 立契约（3 分钟）**：列出 3–5 句待支撑句，每句标注需要的文献类型（原始方法 / 综述 / 数据集 / 同类算例）。写进 `literature/检索契约.md`。

**Step 1 概念拆解**：每句拆成 phenomenon / entity / relationship / context / boundary，得到中英关键词表（英文检索用英文术语，不逐字直译）。缩写与全称并列：`VRP OR "vehicle routing problem"`。

**Step 2 双引擎召回**（在 `tools/paper_search/scripts/` 下执行）：

```powershell
python hybrid_scholar.py --query "flexible job shop scheduling NSGA-II makespan" `
  --limit 10 --year-from 2015 --field operations_research --min-citations 5 `
  --email you@example.com --json > literature/raw_scheduling.json
```

- 可用参数：`--query/-q`（必填）、`--limit/-n`（默认 8，两引擎各取 `max(2n,15)` 再融合）、`--email/-e`、`--sort/-s`（`relevance`、`cited_by_count:desc`、`publication_year:desc` 等）、`--min-citations`、`--year-from`、`--year-to`、`--field`（`mathematics`/`computer_science`/`engineering`/`statistics`/`operations_research`/`physics`/`economics`）、`--json/-j`。
- AnySearch 需鉴权时先设 `$env:ANYSEARCH_API_KEY="<key>"`，或传 `--anysearch-api-key`；`anysearch_academic.py` 无独立 CLI，只能经 `hybrid_scholar.py --anysearch-only` 调用。
- 单源诊断：`--openalex-only`、`--anysearch-only`；返回值按 `cross_validated` / `openalex_only` / `anysearch_only` 三区输出。
- 结果字段：`title`、`authors`、`year`、`citations`、`doi`、`abstract`、`sources`、`cross_validated`、`venue`、`volume`、`issue`、`pages`、`url`；统计字段 `stats.openalex_total`、`anysearch_total`、`cross_validated`、`openalex_unique`、`anysearch_unique`、`filtered_irrelevant`、`collapsed_duplicates`。
- 相关性门槛（脚本内建）：查询词 ≥2 个时，候选须命中 ≥2 个词；标题命中记 3 分、摘要/刊名命中记 1 分。因此**关键词别堆成一句话**，宁可跑 3 次窄查询。

**Step 3 补源（按源分级回退）**：T1 结构化 API（Crossref / OpenAlex / PubMed / arXiv）→ T2（Semantic Scholar，引用图与领域过滤）→ T3（Google Scholar 抓取、CNKI/万方人工）。每个主题至少两个独立源；预印本只作补充，正式版出现后以正式版为准（arXiv 1 req/3s，NCBI 3 req/s，Crossref 列表 1 req/s）。

**Step 4 去重（两把尺子，取严）**：

1. **DOI 主键**：抽取 `10.\d{4,}/...`，去掉 `https://doi.org/` 前缀，转小写去空格；DOI 相同即同一条。
2. **标题 + 年份模糊匹配**：标题小写、去标点与停用词后算词集相似度。脚本实现为 `|A∩B| / max(|A|,|B|) ≥ 0.85` 且「年份相同或一方缺失」（`_fuzzy_dedup`）；共享去重规范更严：Jaccard `|A∩B|/|A∪B| ≥ 0.90` 且第一作者姓氏相同。
3. **合并偏好**：元数据更完整（有 DOI + 卷 + 页）> 出版方版本优于预印本 > 引用量高者兜底；合并后保留 `sources` 两条来源。
4. 0.85–0.90 之间的灰色合并一律人工看标题，别让「预印本 + 正式版」两条同时进参考文献表。

**Step 5 核验**：进「引用核验与格式」逐条打状态；未通过的不进正文。

**Step 6 深读与归档**：读摘要/结果段（不能只读标题），写文献卡与综述矩阵；笔记 frontmatter 用 `title/author/year/journal/doi/classification/tags/date_read`，`classification` 取 `A_核心主线`、`B_章节支撑`、`C_工程背景`、`D_方法借鉴`、`E_暂存低优先`；文件名 `{第一作者姓}{年份}_{中文核心词}.md`。

**Step 7 交付**：`literature/refs.bib`（或 `refs.ris`）+ `literature/核验报告.md`（逐条状态）+ `literature/检索记录.md`（查询式、日期、命中数、去重数）。

## 检索式模板

构造规则：同一概念内用 `OR` 扩同义词与缩写，概念之间用 `AND`；专有名词与固定术语加引号做短语；限定年份（近 5–10 年）与文献类型（`journal-article`、`proceedings-article`、`posted-content`）；`NOT` 慎用，宁可加限定词。

| 主题 | 英文检索式（直接喂 `--query`） | 建议限定 |
|---|---|---|
| 优化调度 | `("job shop" OR "flexible job shop" OR "production scheduling") AND (NSGA-II OR "multi-objective evolutionary algorithm") AND (makespan OR "energy consumption")` | `--field operations_research --year-from 2015` |
| 传染病动力学 | `(SEIR OR SIR OR "compartmental model") AND ("basic reproduction number" OR "next generation matrix") AND ("parameter estimation" OR "least squares")` | `--field mathematics`，参数值另查实测文献 |
| 评价体系 | `(AHP OR "entropy weight" OR TOPSIS OR "combination weighting") AND ("evaluation index system" OR "comprehensive evaluation") AND ("consistency ratio" OR "sensitivity analysis")` | `--field statistics --min-citations 10` |
| 路径规划 | `("vehicle routing problem" OR VRP OR "traveling salesman problem") AND ("genetic algorithm" OR "ant colony optimization" OR "column generation") AND (time window)` | `--field operations_research` |
| 预测 | `("grey prediction" OR "GM(1,1)" OR ARIMA OR LSTM OR Prophet) AND ("small sample" OR "time series forecasting") AND ("error metric" OR MAPE)` | `--field statistics --year-from 2018` |
| 图像识别 | `("convolutional neural network" OR CNN OR YOLO OR "vision transformer") AND ("image classification" OR "object detection") AND ("transfer learning" OR "data augmentation")` | `--field computer_science --sort cited_by_count:desc` |

中文检索式（CNKI/万方高级检索，人工执行）：`主题=(调度 AND 多目标 AND 改进遗传算法) AND 年份 between(2015,2026) AND 来源类别=北大核心`；万方用 `题名或关键词:(路径优化 * 冷链) * 遗传算法`。检索后记录命中数，为「空白判断」留证据。

同义词扩展示例：调度 ↔ scheduling / timetabling；评价 ↔ evaluation / assessment / ranking；预测 ↔ forecasting / prediction；路径 ↔ routing / path planning / VRP。

## 引用核验与格式

### 核验硬流程（零幻觉引用）

1. **先抓标识**：从检索结果或原文取 DOI/PMID/arXiv ID；无标识的条目一律进 `manual_needed`。
2. **DOI 解析（最便宜、最先做）**：`curl -s "https://api.crossref.org/works/10.xxxx/yyyy?mailto=you@example.com"`。404 = DOI 本身错号；200 但标题/作者对不上 = **DOI 张冠李戴**（实践中最高频的硬错误）。标题比对建议 Levenshtein ≥ 0.70，年份相同者优先。
3. **无 DOI 回退**：Crossref `query.bibliographic` 标题检索 → 2000 年前 IEEE 老文献走 Xplore（Crossref 404 不算错）→ 中文文献走 CNKI/万方页面。
4. **开放获取状态**：`https://api.unpaywall.org/v2/{doi}?email=you@example.com` 看 `is_oa`、`oa_status`、`best_oa_location.url_for_pdf`（`email` 必须真实，占位邮箱返回 422）；PMC/Europe PMC 全文为 JATS，缺 `<body>` 说明只有元数据，别当成读到了全文。
5. **撤稿/更正**：Crossref `filter=update-type:retraction` 并检查 `update-to` 指向的 DOI；查不到公告不等于没撤稿，写「已查来源未见公告」。
6. **五分类落状态**：`verified`（标题+刊名+年份全对）/ `mismatch`（存在但字段冲突）/ `not_found`（任何源都无）/ `suspicious`（字段残缺、仅部分标题命中）/ `manual_needed`（无可解析标识）。
7. **硬闸门**：`not_found` 与 `suspicious` 一律不得进入参考文献表；正式稿中「未核验」条目数为 0，否则删除该句或改写成不依赖该文献的表述。
8. **批量节奏**：超过 20 条按 10–15 条分组并行核验后汇总；置信度四级 `✅ Verified` / `⚠️ Check suggested` / `❌ Needs fix` / `❓ Unverifiable`。

### 三种格式的字段对照

| 字段 | GB/T 7714-2015（国赛常用） | APA 7 | BibTeX |
|---|---|---|---|
| 作者 | 姓前名后，英文姓全大写、名缩写，≤3 人全列，>3 人列前 3 + `等`/`et al.` | `Zhang, S., Li, M., & Wang, Q.`，≤20 人全列 | `author = {Zhang, San and Li, Ming}`，分隔符 ` and ` |
| 题名 | 原样，不加引号 | 句首大写，不加引号 | `title = {...}`，专有名词用花括号护大小写 |
| 类型标识 | `[J]` 期刊、`[M]` 专著、`[C]` 会议、`[D]` 学位论文、`[EB/OL]` 电子资源 | 无标识，靠字段区分 | 条目类型 `@article`/`@book`/`@inproceedings`/`@phdthesis` |
| 出版源 | 刊名 / 会议录名（`[C]//` 前缀） | 刊名与卷号斜体 | `journal` / `booktitle` |
| 年卷期页 | `2023, 43(6): 1521-1534.` | `43`(6), 1521–1534. | `year` / `volume` / `number` / `pages`（页码用 `--`） |
| DOI | `DOI:10.xxxx/yyyy.` | `https://doi.org/10.xxxx/yyyy` | `doi = {10.xxxx/yyyy}` |
| 访问日期 | `[2026-11-22]`（电子资源必填） | 仅网页类写 `Retrieved Month D, YYYY` | `urldate`（biblatex） |

### 字段填法示例（作者/标题/DOI 均为占位，替换为核验后的真实值）

```text
[1] ZHANG S, LI M, WANG Q. A multi-objective scheduling model for flexible job shop[J]. Systems Engineering — Theory & Practice, 2023, 43(6): 1521-1534. DOI:10.12011/SETP2022-0135.
[2] CHEN H, ZHAO L. Parameter estimation of a delayed SEIR model[C]//Proceedings of the 2022 International Conference on Modeling, Simulation and Optimization. Piscataway: IEEE, 2022: 88-95.
[3] LIU Y. 城市冷链物流配送路径优化研究[D]. 上海: 上海交通大学, 2021: 45-52.
```

```text
Zhang, S., Li, M., & Wang, Q. (2023). A multi-objective scheduling model for flexible job shop. Systems Engineering — Theory & Practice, 43(6), 1521–1534. https://doi.org/10.12011/SETP2022-0135
```

```bibtex
@article{zhang2023scheduling,
  author  = {Zhang, San and Li, Ming and Wang, Qiang},
  title   = {A multi-objective scheduling model for flexible job shop},
  journal = {Systems Engineering --- Theory \& Practice},
  year    = {2023}, volume = {43}, number = {6},
  pages   = {1521--1534}, doi = {10.12011/SETP2022-0135}
}
```

### RIS / BibTeX 导入导出

- **RIS**（EndNote/Zotero 通用）：每条 `TY  - JOUR` 起、`ER  -` 加空行止；`AU  - Last, Given` 一人一行且保持原序；`TI/JO/PY/VL/IS/SP/EP/DO/UR` 依次填；不写 `N2` 长摘要。
- **作者完整性 preflight**：每个作者必须有姓 + 名（或缩写）；只有姓的行（`AU  - Chaudhuri`）会让条目导入后变孤儿；导出时不得擅自截断成 `et al.`；中文团体作者写 `AU  - 某某研究组,`。
- **BibTeX**：键用 `firstauthorYEAR`（冲突加 `a`/`b`），必填 `author/title/journal/year`（`@inproceedings` 用 `booktitle`），`&` 转义为 `\&`，`pages` 用 `--`，按作者姓排序。
- 导出后核对条数：检索契约条数 = bib 条目数 + 明确丢弃（附原因）条数。

### 文献卡（速读模板，8 项）

```text
- 元数据：作者/年/题名/刊名/卷期页/DOI（未核验则标 ⚠️）
- 一句话结论：[Paper: Abstract] 用了什么方法、在什么条件下得到什么数量级结果
- 要解决的问题 / 前人不足：
- 方法拆解：输入 → 关键模块 → 输出；核心假设 2–3 条
- 证据链：| 结论 | 证据（图/表/指标） | 基线 | 是否支持 |
- 可借用点：能落到本题哪个子问题 [Analysis]
- 边界与局限：数据范围、假设失效条件、作者自述局限
- 对我而言：支撑 / 对照 / 仅背景；引用到哪一节
```

只有摘要时，方法/局限部分写「仅摘要，不可评估」，不要脑补。需要 16 节全量精读卡时用 `vendor/nature/nature-paper-card/references/card-schema.md`。

### 文献综述矩阵（写「模型对比」或「研究现状」节时用）

```text
| 文献 | 年份 | 方法 | 数据/对象 | 关键结论 | 与本题关系 | 可信度 |
| Zhang 2023 | 2023 | NSGA-II + 禁忌搜索 | 柔性作业车间算例 | 换型时间入目标使 makespan 降 12% | 可借用目标函数 | A |
| Chen 2022 | 2022 | 延迟 SEIR + 最小二乘 | 某市 2021 疫情数据 | 引入时滞后 R0 估计下移 8% | 对照参数取值 | B |
| 汇总 | — | — | — | 3 篇支持、1 篇相左 | 争论点在权重设定 | — |
```

矩阵下方写三行：共同结论、彼此矛盾之处、**空白**（无人研究的具体角度，作为本文动机）。

## 检查清单

- [ ] 正文每个引用编号在文末存在，文末每条在正文被引（双向对应）。
- [ ] 每条文献有 DOI 或可访问的出版方/数据库页面，且标题、作者、年份、卷期页已比对。
- [ ] 核验报告中 `not_found`/`suspicious` 数量为 0；`mismatch` 已逐条修正。
- [ ] 全文格式统一（GB/T 7714 或目标竞赛模板），序号连续，`[J]/[C]/[D]` 标识正确。
- [ ] 英文作者姓全大写与名缩写一致；中文作者无错别字；`et al.` 使用符合人数阈值。
- [ ] BibTeX 键唯一，`latexmk` 构建无 undefined citation，`.bib` 与正文 `\cite` 一一对应。
- [ ] 参数取值写明来源类型（文献值/反演/假设），文献值带 DOI。
- [ ] 数据集有 DOI 或官方页面 + 访问日期，版本号一致。
- [ ] 没有把综述当原始方法出处；没有用引用量代替正确性。
- [ ] 检索记录含查询式、源、日期、命中数、去重数，可复现。
- [ ] 常识性方法没有被硬塞引用；引用条数落在 12–25 区间。
- [ ] 每条引用确实支撑其所在一句（读过摘要或结果段，而非只看标题）。

## 与数模三角色的衔接

- **建模手**：产出「假设/方法 → 文献」对照表（不涉及格式）。模型选择理由给 1–2 条可核验出处；参数取值范围带来源；常识方法不凑引用。需要判断「这个方向有没有人做过」时先跑空白分析流程（`vendor/nature/nature-literature-pipeline/references/gap-analysis.md`）。
- **编程手**：为数据集、基线算法、关键参数标注 DOI 或 BibTeX 键，写进代码注释与 `results/复现清单.json` 旁注，避免论文手回填时对不上号。
- **论文手**：接收三件套——`refs.bib`/`refs.ris`、核验报告、文献卡与矩阵路径；CUMCM LaTeX 项目把条目放进 `tools/latex/assets/templates/cumcm/references.bib`（文件首行已注明「只加入已由正文引用且核验过出版信息的文献」）；交付前跑 `paper_format.validate_paper_structure()` 查参考文献双向对应，并按 `roles/论文手/references/自审框架.md` 的「DOI 和出版信息已核验」条款复核。
- **交接纪律**：检索方不改写正文结论，写作方不改写文献元数据；发现字段冲突回传核验报告，由检索方重查后统一更新。

## 深读索引

路径相对 `packages/dsh-math-modeling/assets/`。

| 路径 | 内容 | 何时读 |
|---|---|---|
| `tools/paper_search/SKILL.md` | 双引擎定位、融合与核验规则 | 第一次检索前 |
| `tools/paper_search/scripts/hybrid_scholar.py` | `_fuse`/`_fuzzy_dedup`/相关度门槛的真实实现与 CLI | 需要精确阈值或改融合策略时 |
| `tools/paper_search/scripts/openalex_scholar.py` | 过滤参数、领域 Concept ID、`citation_format` | 写过滤条件、取结构化字段时 |
| `tools/paper_search/scripts/anysearch_academic.py` | JSON-RPC 调用与 Markdown 兜底解析 | AnySearch 返回异常或需单独调试时 |
| `vendor/nature/nature-academic-search/SKILL.md` | 检索/核验/文件管理的工作流路由 | 需要按标准流程执行时 |
| `vendor/nature/nature-academic-search/references/search-strategy.md` | 检索式构造、源选择决策树、排序策略 | 写 query、定排序时 |
| `vendor/nature/nature-academic-search/references/source-tiers.md` | T1/T2/T3 源分级、限流与回退规则 | 选源与补源时 |
| `vendor/nature/nature-academic-search/references/dedup-engine.md` | DOI 主键 + 标题 Jaccard 0.90 + 首作者姓氏匹配 | 处理重复条目时 |
| `vendor/nature/nature-academic-search/references/citation-parser.md` | docx/tex/txt 引文抽取正则与五分类判据 | 核验已有稿件引用时 |
| `vendor/nature/nature-academic-search/references/ris-bibtex-format.md` | RIS/BibTeX/ENW 字段映射与清洗规则 | 导出与转格式时 |
| `vendor/nature/nature-academic-search/references/workflows/wf2-citation-verification.md` | 逐条核验流程与报告结构 | 批量核验时 |
| `vendor/nature/nature-citation/references/search-strategy.md` | claim→三级 query 构造、support grading、证据注模板 | 判断「这篇到底支不支持这句话」时 |
| `vendor/nature/nature-citation/references/ris-endnote.md` | RIS 作者完整性 preflight 与 Zotero RDF | 导出前查作者字段时 |
| `vendor/nature/nature-ref-verifier/SKILL.md` | 逐字段对比矩阵、三级严重度、置信度四级 | 最终核验与出报告时 |
| `vendor/nature/nature-ref-verifier/references/common-patterns.md` | 卷年不一致、作者幻造、页码漂移、DOI 错号等高频错误 | 命中问题后判性质时 |
| `vendor/nature/nature-paper-card/references/card-schema.md` | 16 节精读卡结构与证据要求 | 需要深读一篇核心文献时 |
| `vendor/nature/nature-paper-card/references/evidence-and-provenance.md` | `[Paper]/[External]/[Analysis]/[Hypothesis]` 标签与指针写法 | 写文献卡与分析结论时 |
| `vendor/nature/nature-literature-pipeline/references/scoring-system.md` | 六维评分（主题 35 / 方法 20 / 来源 15 …）粗筛 | 候选多于 20 篇需排序时 |
| `vendor/nature/nature-literature-pipeline/references/note-template.md` | 文献笔记 frontmatter、六段正文、文件命名 | 归档笔记时 |
| `vendor/academic/deep-research/references/crossref_api_protocol.md` | DOI 核验、Levenshtein 0.70 标题校验、撤稿观测、降级处理 | 写核验脚本或判定 mismatch 时 |
| `vendor/academic/deep-research/references/source_quality_hierarchy.md` | 证据分级 A–F、field-specific 调整、掠夺性期刊红旗 | 评估来源可信度时 |
| `vendor/academic/deep-research/templates/literature_matrix_template.md` | 综述矩阵、收敛汇总、知识空白表 | 写研究现状一节时 |
| `vendor/scientific/paper-lookup/SKILL.md` | 18 库选源表、可复现检索契约、HTTP 200 也会失败 | 需要 Crossref/Unpaywall/S2 具体用法时 |
| `vendor/scientific/paper-lookup/references/unpaywall.md` | OA 状态判定与合法 PDF 链接 | 需要全文或判断是否开放获取时 |
| `roles/论文手/references/自审框架.md` | 「参考文献双向对应 + DOI 已核验」检查条款 | 定稿自审时 |
| `roles/论文手/references/论文格式规范.md` | 参考文献与 LaTeX/Pandoc 构建校验（`latexmk`、`validate_paper_structure`） | 排版与最终构建时 |

## 常见失败模式

1. **幻觉引用（vibe citing）**：把 2–3 篇真论文的元素拼成一条不存在的文献。唯一防线是逐条 DOI 解析 + 标题比对；灰区一律判 FAIL，不写进参考文献表。
2. **DOI 张冠李戴**：DOI 能解析但指向同卷另一篇。只看「解析成功」不算核验，必须比标题与第一作者。
3. **卷年与 DOI 年混淆、Early Access 漂移**：以 Crossref 现值为准（卷年优先，无卷号取上线年）；把预印本页码当正式页码会让整段页码错。
4. **标题级判断当证据**：只看到标题相关就写「文献表明」。凡引用都要落到摘要/结果段，否则标 `metadata-only candidate` 且不作支撑。
5. **单引擎冒充全局结论**：只跑 `--openalex-only` 或只查 Crossref 就写「尚无相关研究」。至少两源 + 中文人工通道。
6. **中文文献被「查无」**：中文期刊 DOI 不在 Crossref，CNKI/万方无程序化接口。空结果要写「已查源未覆盖中文库」并人工补查。
7. **引用量排序陷阱**：高被引但主题无关的经典文献挤进前几条（脚本已按词覆盖率过滤，仍须人工核对题名与摘要是否真做同一问题）。
8. **参考文献表单向存在**：正文引了但文末缺，或文末列了正文没引。论文手阶段才暴露，回溯成本最高——检索阶段就用编号与 bibkey 双向登记。
9. **作者字段残缺**：只导出姓氏或擅自截成 `et al.`，导入 EndNote/Zotero 后条目不可查、后续核验全部失效。
10. **参数来源失记**：参数抄自某篇文献却没记 DOI，最终只能写「经验取值」，评审直接质疑模型可信度。

> 来源整合：math-modeling-skill（tools/paper_search）、nature-skills（nature-academic-search、nature-citation、nature-ref-verifier、nature-paper-card、nature-literature-pipeline）、academic-research-skills（deep-research）、scientific-agent-skills（paper-lookup）；许可见 assets/NOTICE.md。
