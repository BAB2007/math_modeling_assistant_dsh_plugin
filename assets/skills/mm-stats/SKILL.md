---
name: mm-stats
description: 面向数学建模的数据探索、假设检验与模型验证技能——用决策树选定检验并给出统计量/自由度/p/效应量/置信区间，核查正态性、方差齐性与独立性并做多重比较校正，完成残差诊断、交叉验证、OAT/网格/Sobol 灵敏度、一阶泰勒与蒙特卡洛误差传播、量纲一致性和时间序列平稳性与预测基线对照；触发词：统计检验、显著性、灵敏度、误差分析、不确定度、相关性。
whenToUse: 当题目需要组间差异或相关性检验、模型验证与残差诊断、参数灵敏度或误差传播、不确定度报告，或时间序列平稳性与预测精度评估时加载。
---

# mm-stats：数据探索、假设检验、不确定度与灵敏度

> 统计结论 = 估计值 + 不确定度 + 设计说明。任何只给 p 值的段落都不算完成。

## 何时用 / 何时不用

**用**：
- 题目给出多组/多批次/多方案数据，需要判断差异或关联是否可辨（A/B 对比、工艺条件比较、问卷与指标相关性）。
- 模型跑通后要交"验证"章节：残差诊断、留出集/交叉验证、稳健性。
- 需要回答"结果稳不稳"：参数灵敏度、置信区间、误差传播、不确定度报告。
- 时间序列题目：平稳性、差分、残差自相关、预测精度与基线对照。
- 论文里要写"模型检验/结果分析/误差分析"小节，需要可直接落稿的措辞。

**不用**：
- 无重复观测的纯机理题（n=1 无法做推断）——改走量纲一致性与参数灵敏度。
- 目标是排序选优或求最优解——统计只负责给出输入的不确定度，选优交给优化/评价类技能。
- 想用 EDA 的图形"证明"结论——探索性发现只能标注为探索性。
- 想用相关系数论证因果——没有设计支持的关联只能写成关联。

## 核心原则

1. **先定估计量与实验单元，再选检验。** 行数不是 n；细胞、视野、重复读数、仿真次数都要先聚合到独立单元。
2. **五元组齐备才算报完**：统计量、自由度、精确 p、效应量、区间估计。缺一项视为未完成。
3. **不拒绝 ≠ 成立。** Shapiro/Levene 不显著只说明"未检出偏离"，不能写成"数据服从正态"。
4. **检验由设计决定，不由预检 p 值决定。** 方差齐性存疑就预声明 Welch，不要按 p 值在两个检验间切换。
5. **显著 ≠ 重要，不显著 ≠ 无差异。** 大样本下微小差异也会 p<.001；小样本阴性结果只能说"未检出"。
6. **校正写在方法里。** 定义检验家族，声明 Bonferroni/Holm/BH-FDR 之一，并报告校正前后差异。
7. **不确定度分层**：Type A（重复观测统计）与 Type B（证书/规格/经验）同等有效；k 由有效自由度决定，不默认 k=2。
8. **数值能跑 ≠ 结论可信。** 残差、留出集、灵敏度、量纲四关都要过。
9. **可复现**：种子、库版本、唯一命令写入复现清单（见 `roles/编程手/references/工作流程.md` 第八节）。

## 检验选择决策树

先问目标，再看数据形态，最后才是检验名。

```
目标
├─ 差异
│  ├─ 2 组独立：正态+方差齐 → Student t；正态+方差不齐 → Welch t；
│  │           非正态/序数 → Mann-Whitney U
│  ├─ 2 组配对：差值近似正态 → 配对 t；差值对称但非正态 → Wilcoxon 符号秩；
│  │           只看方向 → 符号检验
│  ├─ ≥3 组独立：ANOVA；方差不齐 → Welch ANOVA + Games-Howell；
│  │           非正态/序数 → Kruskal-Wallis + Dunn(BH)
│  ├─ ≥3 组重复：重复测量 ANOVA（Mauchly 违例用 GG 校正）/ Friedman
│  └─ 分类结局：χ²（期望频数≥5）/ Fisher 精确（<5）/ McNemar（配对 2×2）
├─ 关联
│  ├─ 连续-连续：线性 → Pearson；单调 → Spearman；并列多或小样本 → Kendall τ
│  ├─ 连续-分类：回归 / ANOVA 框架；二元结局 → Logistic（报 OR + CI）
│  └─ 两组高维：CCA 或逐特征检验 + BH-FDR
├─ 分布
│  ├─ 正态性：Shapiro-Wilk（n≤5000）+ Q-Q；大样本 → Anderson-Darling / Lilliefors
│  ├─ 与理论分布拟合：Lilliefors（参数由数据估计时不能用普通 KS）
│  └─ 两组分布整体：两样本 KS（对任意差异敏感，解释需谨慎）
└─ 预测/验证：不选假设检验，选误差指标 + 按结构切分的留出集 + 残差诊断
```

| 检验 | 统计量 | 自由度 | 效应量 | 区间 |
|---|---|---|---|---|
| Student / Welch t | t | n₁+n₂−2 / Welch df | Cohen's d（或 Hedges' g） | 均值差 95% CI |
| 配对 t | t | n−1 | d_z | 差值均值 95% CI |
| Mann-Whitney U | U（附 z） | — | 秩二列相关 r_rb、CLES | 中位数差 bootstrap CI |
| Wilcoxon 符号秩 | W（附 z） | — | r = z/√N | Hodges-Lehmann 位移 CI |
| ANOVA / Welch ANOVA | F | (k−1, n−k) | η²_p、ω² | 各组均值 CI |
| Kruskal-Wallis | H | k−1 | ε² = H(n+1)/(n²−1) | 中位数 + IQR |
| χ² / Fisher | χ² / — | (r−1)(c−1) | Cramér's V、φ / OR | 比例差 CI / OR 95% CI |
| Pearson / Spearman | r / ρ | n−2（近似） | r、r² | Fisher z 或 bootstrap CI |
| Shapiro / KS | W / D | — | 仅诊断，不报效应量 | — |

## 执行流程

**第 0 步 数据合同**：写清变量含义、单位、缺失码、允许范围、独立实验单元、分组/配对/时间结构、train-val-test 划分依据。缺一项就先补，不要边算边猜。

**第 1 步 EDA（只描述，不删数据）**：

```python
import pandas as pd, numpy as np
df = pd.read_csv("data/input.csv")
df.groupby("group")["y"].agg(n="count", mean="mean", sd="std",
                             median="median", q1=lambda s: s.quantile(.25),
                             q3=lambda s: s.quantile(.75))
df.isna().mean()                       # 缺失率；缺失机制要单独说明
df["y"].skew(), df["y"].kurt()         # 偏度/峰度：判断是否需要变换
```

均值/SD 与中位数/IQR 并报；IQR 或 |z|>3 标出的点是**待核查标记**，不是删除规则。

**第 2 步 假设检查（图 + 检验双证据）**：

```python
from scipy import stats
for k, s in df.groupby("group")["y"]:
    w, p = stats.shapiro(s); print(k, len(s), round(w, 3), round(p, 3))
stats.levene(*[s.values for _, s in df.groupby("group")["y"]], center="median")  # Brown-Forsythe
stats.probplot(df["y"], dist="norm")   # Q-Q 必须看
```

独立性只能由设计判断（配对、聚类、时间顺序），检验帮不上；样本量 >5000 不报 Shapiro 的二元结论；每组 n<10 时改用精确/置换检验，并如实写明"样本量限制结论强度"，不得用"趋势显著"兜底。

**第 3 步 主检验 + 效应量**：

```python
import pingouin as pg
res = pg.ttest(a, b, correction=True)          # 预声明 Welch
d   = pg.compute_effsize(a, b, eftype="cohen") # 有符号：A−B
lo, hi = pg.compute_esci(stat=d, nx=len(a), ny=len(b), eftype="cohen")
aov = pg.anova(dv="y", between="group", data=df, detailed=True)   # η²_p 在 np2 列
pg.pairwise_gameshowell(dv="y", between="group", data=df)         # 方差不齐的多重比较
```

**第 4 步 多重比较校正**：

```python
from statsmodels.stats.multitest import multipletests
reject, p_adj, _, _ = multipletests(pvals, alpha=0.05, method="fdr_bh")  # 或 "holm"
```

家族定义写清：是"全部两两比较"还是"k 个预设主对比"。ANOVA 事后用 Tukey HSD 时不再叠加 Bonferroni。

**第 5 步 验证**（见下一节清单）：残差、交叉验证、灵敏度、误差传播必须落成脚本与表。

**第 6 步 报告**：按"报告模板"落稿，数字全部由代码输出回填，不手抄。

## 数模验证清单

| 项 | 具体做法 | 不通过时的处理 |
|---|---|---|
| 残差诊断 | 残差-拟合图、Q-Q、尺度-位置图；Breusch-Pagan、Durbin-Watson、VIF | 变换、稳健标准误（HC3）、加权最小二乘；VIF>10 时合并或删共线项并说明 |
| 交叉验证 / 留出集 | 时间序列按时间切、分组数据按组切、重复测量按单元切；预处理只在训练集 fit | 出现随机打乱的时间切分或全量标准化即为泄漏，重做 |
| 参数灵敏度（局部） | OAT：一次动一个参数取 ±10%/±20%（5–7 点），报弹性 S=(ΔY/Y)/(ΔX/X) 并排序 | 参数间强交互时 OAT 会漏项，必须补全局方法 |
| 参数灵敏度（全局） | 两参数 11×11 网格热图定位敏感区；Sobol 分解报 S1 与 ST，N≥1024，换种子复核 | ST≫S1 说明存在交互，结论要写"存在交互效应" |
| 误差传播 | 一阶泰勒 u_c²=Σ(c_i·u_i)²（c_i=∂f/∂x_i）；非线性/非正态用蒙特卡洛，M≥1e5，报均值、SD、2.5/97.5 分位 | 两者区间明显不一致且模型非线性时以 MC 为准，并说明所选区间（等尾或最短） |
| 量纲与单位一致性 | 输入/系数/输出单位逐项对齐；用 pint 做量纲校验；轴标签带单位 | 量纲通过仍可能量级荒谬：用特征尺度或无量纲数做合理性筛查 |
| 基线对照 | 均值/线性/naive/seasonal-naive 基线同口径比较 | 模型赢不过基线就不构成改进，只能作为方法展示 |
| 稳健性复跑 | 去极值、换种子、换划分重复，比较结论方向 | 方向翻转即结论不稳，需降级措辞或增大样本 |

## 报告模板

**可直接放进论文的"统计结果段"：**

```text
统计方法：分析使用 Python 3.x（scipy x.y、statsmodels x.y、pingouin x.y）完成，显著性水平 α=0.05，双尾。
数据以均值±标准差表示，括号内为样本量 n；独立实验单元为 <单元>，技术重复先取均值再进入推断。
两组比较采用 Welch t 检验（Levene 中位数检验 F(…)=…，p=…，提示方差不齐）；多组比较采用单因素
方差分析并以 Tukey HSD 控制族错误率，或以 Kruskal-Wallis 检验配合 Dunn 检验（BH 校正）。
正态性用 Shapiro-Wilk 检验与 Q-Q 图核查；未检出偏离不等同于正态性成立。
效应量报告 Cohen's d 及 95% 置信区间；不显著结果同样报告估计值与区间。
结果：<A 组>（M=…，SD=…，n=…）高于 <B 组>（M=…，SD=…，n=…），t(…)=…，p=…，d=…，95% CI […]。
稳健性：对 <参数> 做 ±20% OAT 扫描，输出变化幅度不超过 …%，弹性排序为 …；Sobol 一阶指数
S1=…、总效应指数 ST=…；一阶泰勒与 1e5 次蒙特卡洛传播给出的 95% 区间分别为 […] 与 […]。
时间序列：ADF 检验 p=…（KPSS p=…），一阶差分后平稳；ARIMA(p,d,q) 残差 Ljung-Box p=…；
滚动 origin 回测 RMSE=…、MAE=…，优于 seasonal-naive 基线（RMSE=…），故选用 RMSE 作为主指标。
```

**预测指标选择理由**（写进方法，不要只报数字）：
- RMSE：与大误差同量纲、对大偏差敏感——主指标适合极端值代价高的场景。
- MAE：稳健、易解释——数据含异常点或代价近似线性时作主指标。
- MAPE：无量纲便于跨序列比较，但**含零或接近零的序列不可用**（会爆炸）；此时改 sMAPE 或 MASE。
- 一律与 naive/seasonal-naive 基线同 horizon、同信息集比较；时间序列用滚动 origin，禁止随机打乱。

**时间序列最小流程**：

```python
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.stats.diagnostic import acorr_ljungbox
adfuller(y, autolag="AIC")                              # H0: 有单位根
kpss(y, regression="c", nlags="auto")                   # H0: 平稳（与 ADF 互为补充）
acorr_ljungbox(res.resid, lags=[10], return_df=True)     # 残差白噪声诊断
```

**禁止写法**（出现任一即返工）：

| 禁止 | 替换 |
|---|---|
| 只报 p 不报效应量与 CI | 五元组齐备 |
| 用 `p = .000` 或 `p < .05` 代替精确值 | `p < .001`，其余给 3 位小数 |
| "高度显著""证明了""说明 A 导致 B" | "差异有统计学意义""结果与…一致""与…相关" |
| 换检验/换子集/删点直到 p<.05 | 预声明主分析 + 敏感性分析单独标注 |
| n=3 就下结论、把行数当 n | 报 n 与不精确性，或改用描述 + 灵敏度 |
| 用"不显著"证明"无差异" | 报 CI，必要时 TOST 等效性检验 |
| 用观测到的 power 解释阴性结果 | 做事前功效/灵敏度分析（可检出 d 下限） |
| 相关分析写成因果、把 r 说成"影响" | 保持"关联"措辞并讨论混杂 |

## 检查清单

- [ ] 数据字典、单位、缺失码、独立实验单元已确认，n 的口径写清
- [ ] EDA 出过分布图/箱线图/时间序列图（不是只看 describe）
- [ ] 假设检查有图 + 检验，且写明补救或"保留原设计"的理由
- [ ] 检验与设计匹配（配对/独立、参数/非参数），选择理由可复述
- [ ] 每个检验都有统计量、df、精确 p、效应量、95% CI
- [ ] 多重比较家族与校正方法在方法节写明
- [ ] 阴性/不显著结果同样入表
- [ ] 残差四图 + BP/DW/VIF（或 Ljung-Box）已跑并留档
- [ ] 交叉验证/留出集按结构切分，无泄漏
- [ ] OAT + 至少一种全局或扫描式灵敏度；误差传播有泰勒与 MC 对照
- [ ] 量纲一致，图表坐标轴带单位，百分比口径统一
- [ ] 与基线对照，主指标选择给出理由
- [ ] 种子、库版本、唯一复现命令写入 `results/复现清单.json`
- [ ] 论文中每个数字都能追到代码输出（无手写值）

## 与数模三角色的衔接

- **建模手**：用上面的决策树把"要检验什么、用什么、报什么"写进题目分析报告与模型假设；灵敏度分析是模型章节的必备项（对应 `roles/建模手/references/常见模式.md` 的模式 1、4、9），不是附录。交给编程手的是估计量 + 检验 + 指标口径，不是"跑个显著性"。
- **编程手**：先 `python roles/编程手/scripts/check_env.py --features statistics time-series` 确认依赖；统计量与 CI 一律由代码计算，禁止硬编码；随机流程设种子，参数集中定义并写复现清单；P1/P2 质检时核对统计口径、量纲与图表误差棒含义。
- **论文手**：把"统计结果段"落进模型检验/结果分析节，图注必须写清误差棒是 SD、SEM 还是 95% CI，以及 n 代表什么；把"禁止写法"表当作自审条目逐条过。
- **质量门**：任何显著性结论未附效应量与 CI，或灵敏度分析缺失，不得进入终稿与图表冻结。

## 深读索引

路径相对于 `packages/dsh-math-modeling/assets/`。

| 主题 | 路径 | 何时读 |
|---|---|---|
| 检验选择总览 | `vendor/scientific/statistical-analysis/references/test_selection_guide.md` | 决策树落到具体设计（计数、生存、一致性、因子设计）时 |
| 假设与诊断 | `vendor/scientific/statistical-analysis/references/assumptions_and_diagnostics.md` | 正态性/方差齐性/独立性存疑，或回归诊断要逐项解释时 |
| 效应量与功效 | `vendor/scientific/statistical-analysis/references/effect_sizes_and_power.md` | 算 d/η²/ε²/f²/OR，或做事前功效与灵敏度分析时 |
| 报告规范（APA） | `vendor/scientific/statistical-analysis/references/reporting_standards.md` | 写结果段、核对报价格式与常见错误时 |
| 统计技能主文件 | `vendor/scientific/statistical-analysis/SKILL.md` | 需要完整工作流与 API 版本要点时 |
| EDA 主文件 | `vendor/scientific/exploratory-data-analysis/SKILL.md` | 数据剖析、缺失与泄漏审计、变换敏感性时 |
| 不确定度主文件 | `vendor/scientific/uncertainty-and-units/SKILL.md` | 需要算 u_c、U、k，或审查代码的单位缺陷时 |
| GUM 方法论 | `vendor/scientific/uncertainty-and-units/references/gum-methodology.md` | 做不确定度预算、Welch-Satterthwaite、MC 与线性化对照时 |
| 不确定度数值写法 | `vendor/scientific/uncertainty-and-units/references/reporting-rules.md` | 定有效数字、"±"含义、SD/SEM/CI 选择时 |
| uncertainties 用法 | `vendor/scientific/uncertainty-and-units/references/uncertainties-recipes.md` | 需要保留相关性、从拟合协方差矩阵传播时 |
| 量级合理性 | `vendor/scientific/uncertainty-and-units/references/plausibility-scales.md` | 量纲通过但结果离谱，需用特征尺度/无量纲数筛查时 |
| statsmodels 主文件 | `vendor/scientific/statsmodels/SKILL.md` | 选 OLS/GLM/离散选择/时间序列模型族时 |
| 时间序列 | `vendor/scientific/statsmodels/references/time_series.md` | ADF/KPSS、ACF/PACF、ARIMA/SARIMAX、滚动回测 |
| 统计诊断 | `vendor/scientific/statsmodels/references/stats_diagnostics.md` | 多重比较 API、ANOVA 表、Tukey/Games-Howell、稳健协方差 |
| aeon 主文件 | `vendor/scientific/aeon/SKILL.md` | 时间序列分类/回归/聚类/异常检测、特征提取选型 |
| 预测与回测 | `vendor/scientific/aeon/references/forecasting.md` | 预测器 API、外生变量防泄漏、滚动 origin 评估 |
| 异常与变点 | `vendor/scientific/aeon/references/anomaly_detection.md` | 残差异常、突变检测与阈值设定 |
| 投稿统计审查 | `vendor/nature/nature-statistics/SKILL.md` | 按期刊口径审 n 定义、重复、图注统计时 |
| 常见失败模式 | `vendor/nature/nature-statistics/references/common-failure-modes.md` | 自查伪重复、多重比较、交互误判、小样本过度声称 |
| 统计报告清单 | `vendor/nature/nature-statistics/references/statistical-reporting.md` | 逐项核对方法段最小信息集 |
| 审稿人视角 | `vendor/nature/nature-statistics/references/reviewer-checklist.md` | 交稿前模拟审稿质询 |
| 统计类算法说明 | `algorithms/05-统计分析与数据处理算法说明.md` | 查 t/F/χ²/U/H/ρ 的公式与 Python/MATLAB 写法 |
| 建模模式 | `roles/建模手/references/常见模式.md` | 确认灵敏度分析该挂在哪个模式（模式 1/4/9） |
| 编程执行规范 | `roles/编程手/references/工作流程.md` | 数值稳定性、种子、复现清单、P1/P2 质检口径 |
| 统计图规范 | `tools/figure/SKILL.md` | 箱线/误差棒/相关矩阵怎么画、误差棒含义怎么标 |

## 常见失败模式

1. **伪重复**：把 300 个细胞/帧/仿真步当 n=300。先聚合到独立单元，或用分层模型；否则 p 值被人为压小。
2. **只报 p 不报效应量**：大样本下 d=0.05 也能 p<.001，读者无法判断重要性；反之小样本的大效应被判"无差异"。
3. **n=3 下结论并用观测功效自证**：σ 本身估不准，应报 CI 并说明设计灵敏度（可检出效应下限）。
4. **p-hacking**：换检验、换子集、换去极值规则直到显著。预声明主分析，探索性分析单独标注且不参与结论定稿。
5. **按预检 p 值切换检验**：Levene 显著才用 Welch，等于把选择过程引入误差；应直接预声明 Welch。
6. **依赖结构被丢掉**：配对数据用独立 t、同批次样本当独立、时间序列随机切分做 CV 或全量标准化，导致 CI 过窄或指标虚高。
7. **多重比较不校正**：3 组两两做三次 t 检验，族错误率约 14% 而非 5%。
8. **误差传播误用**：强非线性（比值、平方、指数）仍只用一阶泰勒，出现负的方差区间；或把重复读数 SD 当均值不确定度（差 √n）。
9. **只做 OAT 就宣称"参数不敏感"**：交互项被漏掉；ST≫S1 时必须报交互效应。
10. **量纲与单位失守**：不同单位直接相加、轴标签无单位、把运动黏度当动力黏度、百分数与小数混用。

> 来源整合：scientific-agent-skills（statistical-analysis、exploratory-data-analysis、uncertainty-and-units、statsmodels、aeon）、nature-skills（nature-statistics）、math-modeling-skill（统计类算法说明）；许可见 assets/NOTICE.md。
