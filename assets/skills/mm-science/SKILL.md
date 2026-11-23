---
name: mm-science
description: 数模求解的 Python 科学计算栈速查与 MATLAB 对照——按问题类型选求解器与库、确认某个函数怎么用、拿去可跑的代码骨架与 MATLAB 等价写法，并固定版本、随机种子与复现环境。
whenToUse: 模型已定、要落成 Python 或 MATLAB 代码时使用，覆盖求解器/库选择、函数用法、性能稳定性与可复现环境。
---

## 何时用 / 何时不用

用：

- 模型族已定（或已缩到一个候选族），要把目标、约束、方程、指标落成能跑的代码。
- 有具体 API 疑问：求解器怎么调、方法在哪个库、返回对象字段叫什么、MATLAB 等价函数是哪个。
- 要固定环境、种子、版本、输入哈希与唯一复现命令；或数值出事：收敛失败、量级离谱、条件数爆炸、内存不够、仿真挂死。

不用：

- 还在选模型：先回 `roles/建模手/references/建模设计理论.md` 与 `references/算法索引.md`。
- 要图的设计契约、三类图配额与导出审计：走 `tools/figure/SKILL.md`，本技能只给绘图库调用方式。
- 要论文结构、引用格式、章节写作：`roles/论文手/references/写作规范.md`；只要算法原理与公式推导：读 `algorithms/README.md` 与对应的算法说明文件。

## 核心原则

1. **先精确后启发，降级必须记账**：LP/MILP/NLP 精确解优先，规模或非凸性不允许时再上 GA/DE/PSO/SA，降级理由写进复现清单。
2. **约束先化标准形**：`linprog`/`milp` 一律 `A_ub x ≤ b_ub`；`pymoo` 一律 `g(x) ≤ 0`、`h(x) = 0`；`minimize` 用 `NonlinearConstraint(lb, ub)`。max 转 min 的取负动作记进参数表。
3. **尺度与病态先处理**：量纲差超 10³ 先归一化，多目标加权前各自归一化；解线性系统前算 `np.linalg.cond`，超 1e7 改 `lstsq`/`pinv`/Tikhonov，对称矩阵用 `eigh`。
4. **溢出走对数域**：概率连乘与指数和用 `scipy.special.logsumexp`，阶乘与组合数用 `scipy.special.gammaln`。
5. **随机必须可复现**：Python 用 `np.random.default_rng(seed)` 或显式 `random_state=`/`seed=`；MATLAB 用 `rng(seed, "twister")`。非凸与启发式跑多种子，报最优值与分布。
6. **收敛看标志**：`scipy` 的 `res.success`/`res.status`、MATLAB 的 `exitflag`、`pymoo` 的 `res.CV`；失败就带 `res.message` 报错，不静默返回近似解。
7. **超时主动降级**：单次预估超 10 分钟先降级（精确→启发式、全局→局部、全量→抽样）；`milp(options={"time_limit": 600})`、`intlinprog(optimoptions("MaxTime", 600))`，降级位置写入清单。
8. **大数分块、大图稀疏**：超 1e6 行走 `read_csv(chunksize=...)`、`scipy.sparse`、`MiniBatchKMeans`/`SGDClassifier`；图用 `nx.to_scipy_sparse_array`，中心性用 `k=` 近似。
9. **结果先 sanity check**：验量纲、符号、数量级、边界（全零入→零出），并与解析解或结构等价小实例对比；出现 NaN/inf 立即停手。

## 问题→求解栈映射表

路径相对 `packages/dsh-math-modeling/assets/`；从本文件出发即 `../../`。

| 问题类型 | 首选库与关键函数 | 备选 | 适用边界 | 算法库（读哪节） |
|---|---|---|---|---|
| 线性规划 LP | `scipy.optimize.linprog(method="highs")` | PuLP `LpProblem/LpVariable/value`；MATLAB `linprog` | 单目标连续、约束可写 `A_ub x≤b_ub`；1e3~1e4 变量 | `algorithms/01-优化算法说明.md` §1 |
| 整数/混合整数 MILP | `scipy.optimize.milp(integrality=..., bounds=Bounds)` | PuLP + CBC；OR-Tools CP-SAT；MATLAB `intlinprog` | 0-1 决策、指派、选址、排班；>1e5 变量改列生成或启发式 | `algorithms/01-优化算法说明.md` §2 |
| 非线性与全局优化 | `minimize(method="SLSQP"/"trust-constr")`、`differential_evolution` | `pymoo` GA/DE/PSO；MATLAB `fmincon`/`ga` | 非凸、有界、约束可微；多峰先全局再 `polish=True` 收尾 | `algorithms/01-优化算法说明.md` §4/§5/§8 |
| 多目标优化 | `pymoo.optimize.minimize` + `NSGA2`/`NSGA3` | `MOEA/D`（不支持约束）；MATLAB `gamultiobj` | 2~3 目标用 NSGA-II，4+ 目标用 NSGA-III；结果是 Pareto 近似，不是全局最优证明 | `algorithms/01-优化算法说明.md` §14 |
| 微分方程 ODE / PDE 近似 | `scipy.integrate.solve_ivp`（RK45/LSODA/BDF/Radau） | `odeint`；MATLAB `ode45`/`ode15s` | 刚性用 BDF/Radau 或 `ode15s`；PDE 只做离散近似（有限差、线方法），不得宣称精确解 | `algorithms/06-综合类算法说明.md` §6 |
| 排队与离散事件仿真 | `simpy.Environment` + `Resource`/`PriorityResource`/`Container` | MATLAB SimEvents（`sim` 驱动）；手写事件表 | 要事件级排队纪律、优先级、抢占；必须有界（`until`+实体上限），否则挂死 | `algorithms/06-综合类算法说明.md` §2 |
| 图与网络 | `networkx.shortest_path`/`maximum_flow`/`minimum_spanning_tree`/`betweenness_centrality` | `scipy.sparse.csgraph`；MATLAB `digraph`/`shortestpath`/`maxflow`/`minspantree` | 边数 <1e6 直接建图；大图用稀疏数组或近似中心性 | `algorithms/04-图论与网络分析算法说明.md` §1~§6 |
| 回归与预测 | `statsmodels.OLS(...).fit(cov_type="HC3")`、`GLM`；`sklearn.linear_model.Ridge`/`SVR` | MATLAB `fitlm`、`fitrsvm` | 要系数推断、置信区间、AIC/BIC → statsmodels；只要预测精度 → sklearn；array 模型必须 `add_constant` | `algorithms/02-预测类算法说明.md` §3/§5 |
| 分类与聚类 | `sklearn.pipeline.Pipeline` + `RandomForestClassifier`/`LogisticRegression`/`SVC`；`KMeans`/`DBSCAN`/`AgglomerativeClustering` | `aeon` 时序分类；MATLAB `fitcensemble`/`kmeans` | 预处理必须放 Pipeline 内防泄漏；KMeans 先标准化，DBSCAN 对 `eps` 极敏感 | `algorithms/07-机器学习算法说明.md` §1~§8 |
| 评价与赋权 AHP/熵权/TOPSIS/DEA | numpy 向量化手写（判定矩阵、权重、贴近度） | MATLAB 无对应工具箱，同样手写；评分检验用 `scipy.stats` | 指标 ≤20、方案 ≤100 手写最稳；AHP 必检 `CR<0.1`；DEA 要求 DMU 数 ≥ 2×指标数 | `algorithms/03-评价类算法说明.md` §1/§3/§4/§9 |
| 时间序列 | `statsmodels.tsa.arima.model.ARIMA`、`SARIMAX`、`ExponentialSmoothing` + `adfuller`/`acorr_ljungbox` | `aeon` `ARIMA`/`NaiveForecaster`；MATLAB `arima`/`estimate`/`forecast` | 样本 <50 用灰色 GM(1,1) 或指数平滑；`d` 与手工差分不可重复 | `algorithms/02-预测类算法说明.md` §1/§6/§7 |
| 符号推导 | `sympy.solve`/`solveset`/`dsolve`/`diff`/`integrate`/`lambdify`/`latex` | MATLAB Symbolic Math：`syms`/`solve`/`dsolve`/`matlabFunction` | 求精确解、推公式、生成 LaTeX；大规模数值先 `lambdify` 再交给 numpy | `algorithms/01-优化算法说明.md` §1 推导 |
| 不确定度传播与随机模拟 | `uncertainties.ufloat`/`correlated_values`；`pint` 管量纲；`np.random.default_rng` 做 Monte Carlo | `simpy` 事件级模拟 | GUM 线性传播只在小不确定度下成立，强非线性必须用 Monte Carlo 对照；报样本量、种子与标准误 | `algorithms/03-评价类算法说明.md` §10、`algorithms/06-综合类算法说明.md` §1 |

## 代码骨架（Python + MATLAB 对照）

每段都是最小可运行单元，补上数据即可跑；`assert` 是收敛与可行性检查，不是装饰。

### 1 优化：LP / MILP / NLP / 全局
```python
from scipy.optimize import linprog, milp, Bounds, LinearConstraint, minimize, differential_evolution
lp = linprog([-3, -2], A_ub=[[1, 1], [1, 0]], b_ub=[4, 2], bounds=[(0, None)] * 2, method="highs")   # 最优值 = -lp.fun
ip = milp([-3, -2], integrality=[1, 1], constraints=LinearConstraint([[1, 1], [1, 0]], -float("inf"), [4, 2]), bounds=Bounds(0, None), options={"time_limit": 600})
nl = minimize(lambda v: (v[0] - 1) ** 2 + (v[1] - 2.5) ** 2, [0, 0], method="SLSQP", bounds=[(0, 5)] * 2)
assert lp.status == 0 and ip.status == 0 and nl.success, (lp.message, ip.message)   # 全局最优对比用 differential_evolution(seed=42, polish=True)
```
```matlab
f = [-3; -2]; A = [1 1; 1 0]; b = [4; 2]; lb = zeros(2, 1); rng(42, "twister");
[x1, ~, ok1] = linprog(f, A, b, [], [], lb, [], optimoptions("linprog", "Display", "off"));
[x2, ~, ok2] = intlinprog(f, [1 2], A, b, [], [], lb, [], optimoptions("intlinprog", "MaxTime", 600));
[v, ~, ok3] = fmincon(@(v) (v(1)-1)^2 + (v(2)-2.5)^2, [0 0], [], [], [], [], [0 0], [5 5], [], optimoptions("fmincon", "Display", "off")); assert(ok1 > 0 && ok2 > 0 && ok3 > 0, "未收敛，检查 exitflag 与约束残差");
```
### 2 多目标（Pareto 前沿）
```python
from pymoo.core.problem import FunctionalProblem
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize as mo_minimize
prob = FunctionalProblem(n_var=2, xl=[0, 0], xu=[4, 4], n_ieq_constr=1, constr_ieq=lambda x: [1.5 - x[0] - x[1]], objs=lambda x: [x[0] ** 2 + x[1] ** 2, (x[0] - 4) ** 2 + (x[1] - 4) ** 2])   # g(x) <= 0 才可行
res = mo_minimize(prob, NSGA2(pop_size=80), ("n_gen", 100), seed=42, verbose=False)   # 也可写 get_termination("n_gen", 100)
assert res.F is not None, "无可行解，先看 res.CV 与约束符号"
```
```matlab
mo = @(v) [v(1)^2 + v(2)^2, (v(1) - 4)^2 + (v(2) - 4)^2]; rng(42, "twister");
[X, F] = gamultiobj(mo, 2, [], [], [], [], [0 0], [4 4], optimoptions("gamultiobj", "Display", "off", "ParetoFraction", 0.35)); assert(size(F, 1) > 1, "Pareto 集过小，检查种群规模、代数与标度");
```
### 3 微分方程
```python
from scipy.integrate import solve_ivp
sol = solve_ivp(lambda t, y: [-0.3 * y[0] * y[1], 0.3 * y[0] * y[1] - 0.1 * y[1], 0.1 * y[1]], (0.0, 160.0), [0.99, 0.01, 0.0], method="RK45", rtol=1e-8, atol=1e-10, dense_output=True)
assert sol.success, sol.message                      # 刚性方程改 method="BDF" 或 "LSODA"
```
```matlab
[t, Y] = ode45(@(t, y) [-0.3*y(1)*y(2); 0.3*y(1)*y(2) - 0.1*y(2); 0.1*y(2)], [0 160], [0.99; 0.01; 0], odeset("RelTol", 1e-8, "AbsTol", 1e-10)); assert(all(isfinite(Y), "all"), "出现 NaN/inf，改 ode15s");
```
### 4 排队与离散事件仿真
```python
import random, simpy
arr_rng, srv_rng = random.Random(101), random.Random(202)   # 独立随机流，种子固定
env = simpy.Environment(); server = simpy.Resource(env, capacity=2); waits = []
def customer(arrival):
    with server.request() as req:
        yield req; waits.append(env.now - arrival)
        yield env.timeout(srv_rng.expovariate(1 / 6.0))
def arrivals():
    for _ in range(10_000):
        d = arr_rng.expovariate(1 / 4.0)
        if env.now + d >= 480.0: return
        yield env.timeout(d); env.process(customer(env.now))
env.process(arrivals()); env.run(until=480.0)   # 时间与实体双上限，缺一必挂
```
```matlab
% SimEvents：Generator → Queue → Server → Terminator，队列与实体上限写在模块参数里
simOut = sim("queue_model.slx", "StopTime", "480"); w = simOut.logsout.get("waitTime").Values.Data; mean(w(isfinite(w)))
```
### 5 图与网络
```python
import networkx as nx
G = nx.DiGraph(); G.add_weighted_edges_from([("A", "B", 4), ("A", "C", 2), ("C", "B", 1), ("B", "D", 5)], weight="cost")
path = nx.shortest_path(G, source="A", target="D", weight="cost"); mst = nx.minimum_spanning_tree(G.to_undirected(), weight="cost")
H = nx.DiGraph(); H.add_edge("s", "a", capacity=10); H.add_edge("a", "t", capacity=4); value, flow = nx.maximum_flow(H, "s", "t")
```
```matlab
G = digraph(["A"; "A"; "C"; "B"], ["B"; "C"; "B"; "D"], [4; 2; 1; 5]);
[path, d] = shortestpath(G, "A", "D"); T = minspantree(graph(["A"; "A"; "C"; "B"], ["B"; "C"; "B"; "D"], [4; 2; 1; 5])); [mf, GF] = maxflow(digraph(["s"; "a"], ["a"; "t"], [10; 4]), "s", "t");
```
### 6 回归、分类与聚类
```python
import statsmodels.api as sm
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
fit = sm.OLS(y, sm.add_constant(X, has_constant="add"), missing="raise").fit(cov_type="HC3")
pipe = make_pipeline(StandardScaler(), RandomForestClassifier(n_estimators=300, random_state=42))
tr, te, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42); print(cross_val_score(pipe, tr, ytr, cv=StratifiedKFold(5, shuffle=True, random_state=42), scoring="balanced_accuracy").mean())
```
```matlab
mdl = fitlm(table(x1, x2, y, "VariableNames", {"x1", "x2", "y"}), "y ~ x1 + x2");   % Coefficients: Estimate/SE/pValue
cv = cvpartition(y, "HoldOut", 0.2); rng(42, "twister");
clf = fitcensemble(X(training(cv), :), y(training(cv)), "Method", "Bag", "NumLearningCycles", 300);
acc = mean(predict(clf, X(test(cv), :)) == y(test(cv))); [idx, C] = kmeans(zscore(X), 3, "Replicates", 10);
```
### 7 评价与赋权（熵权 + TOPSIS）
```python
import numpy as np
def entropy_weight(M):                                   # M 已正向化且非负
    P = np.clip(M / M.sum(axis=0), 1e-12, None); d = 1 - (-(P * np.log(P)).sum(axis=0) / np.log(M.shape[0])); return d / d.sum()
def topsis(M, w, benefit):                               # benefit: 布尔数组，True=效益型
    Z = M / np.sqrt((M ** 2).sum(axis=0)); Z[:, ~benefit] = Z[:, ~benefit].max(axis=0) - Z[:, ~benefit]
    dp, dn = np.sqrt((w * (Z - Z.max(0)) ** 2).sum(1)), np.sqrt((w * (Z - Z.min(0)) ** 2).sum(1)); return dn / (dp + dn)
```
```matlab
M = M ./ sum(M, 1); P = max(M, 1e-12); e = -sum(P .* log(P), 1) / log(size(M, 1)); w = (1 - e) / sum(1 - e);   % AHP 一致性：CR = (lambda_max - n) / (n - 1) / RI(n) < 0.1
```
### 8 时间序列、符号推导
```python
import pandas as pd, sympy as sp
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.stats.diagnostic import acorr_ljungbox
from aeon.classification.convolution_based import RocketClassifier
y = pd.Series(values, index=pd.date_range("2015-01-01", periods=len(values), freq="MS"))
fit = ARIMA(y, order=(1, 1, 1), trend="n").fit(); band = fit.get_forecast(steps=12).conf_int(alpha=0.05)
lb = acorr_ljungbox(fit.resid, lags=[12], return_df=True); clf = RocketClassifier(n_kernels=2000).fit(X_train, y_train)
x = sp.symbols("x", positive=True, real=True)
sol = sp.solve(sp.Eq(x ** 2 - 5 * x + 6, 0), x); dx = sp.diff(sp.exp(-x) * sp.sin(x), x); f_num = sp.lambdify(x, dx, "numpy")
```
```matlab
est = estimate(arima(1, 1, 1), y, "Display", "off"); [yF, yMSE] = forecast(est, 12, "Y0", y); ci = [yF - 1.96 * sqrt(yMSE), yF + 1.96 * sqrt(yMSE)];
syms x positive; sol = solve(x^2 - 5*x + 6 == 0, x); dx = diff(exp(-x)*sin(x), x); fh = matlabFunction(dx);
```
### 9 不确定度、量纲与绘图
```python
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt, seaborn as sns
from uncertainties import ufloat
A = ufloat(12.7, 0.05) * ufloat(25.4, 0.08)             # 标称值 ± 标准不确定度（mm）
print(f"A = {A.nominal_value:.1f} ± {2 * A.std_dev:.1f} mm^2 (k=2)")   # 先舍入不确定度再定有效位
fig, ax = plt.subplots(figsize=(6.0, 3.7)); ax.plot(x, y, lw=1.2); ax.set_xlabel("t / s"); ax.set_ylabel("y / m")
fig.savefig("result_q1_trend.png", dpi=300, bbox_inches="tight")
sns.lineplot(data=df, x="t", y="v", hue="grp", errorbar=("ci", 95), ax=ax)
```
```matlab
m = 20.0; sd = 0.5; rng(42, "twister"); mcs = m + sd * randn(20000, 1);   % Monte Carlo 区间
ci = prctile(mcs, [2.5 97.5]); plot(mcs, "k."); xline(ci(1), "r--"); xlabel("t / s"); ylabel("y / m");
print(gcf, "result_q1_trend.png", "-dpng", "-r300");   % 不用 grid on
```

## 可复现与环境

**依赖检查（只查实际用到的功能）**
```powershell
python "<ASSETS>/roles/编程手/scripts/check_env.py" --features data optimization statistics graph machine-learning time-series
```
可选功能：`data`、`visualization`、`excel`、`optimization`、`integer-optimization`、`statistics`、`machine-learning`、`time-series`、`graph`、`image`。缺什么报什么，不换语言也不换模型。
```matlab
addpath("<ASSETS>/roles/编程手/scripts"); report = check_matlab_env(["data", "visualization", "optimization"]); assert(report.ok, "缺少所选模型需要的工具箱");
```
**requirements 片段（按实际用量裁剪，全部钉版本）**
```text
numpy==2.5.3
scipy==1.18.1
pandas==3.0.6
statsmodels==0.15.0
scikit-learn==1.9.1
sympy==1.14.0
networkx==3.7
pymoo==0.6.2
simpy==4.1.2
matplotlib==3.11.2
seaborn==0.13.2
aeon==1.6.0
uncertainties==3.2.3
pint==0.26.1
```
`pulp`/`ortools` 只在整数规划且 `scipy.optimize.milp` 不够用时加入；`stumpy` 只服务 aeon 的 matrix profile，别默认装。
**四项固定动作**
1. **一个种子入口**：命令行收 `--seed 42`，一处派生 `np.random.default_rng(seed)`、`random_state=seed`、`pymoo minimize(..., seed=seed)`、`random.Random(seed)`；MATLAB 只调一次 `rng(seed, "twister")`，禁止中途重播。
2. **版本落盘**：Python 用 `importlib.metadata.version(...)` 逐项记实际版本；MATLAB 记 `version` 与 `ver` 中实际用到的工具箱版本，理论下限版本不算记录。
3. **输入哈希**：每个输入算 SHA-256（`roles/编程手/scripts/repro_manifest.py` 自动做），改数据必须改哈希。
4. **落盘命名**：结果 `results/问题1_结果.csv`、`results/复现清单.json`；图 `figures/{raw,process,result}_q1_*.svg|.png`；数值不手抄进论文，只引用代码输出。
```powershell
python "<ASSETS>/roles/编程手/scripts/repro_manifest.py" --project-root "<PROJECT_ROOT>" --input "<PROJECT_ROOT>/data/input.csv" --seed 42 --parameters '{"alpha":0.1}' --command "python 问题1_求解.py --seed 42" --package scipy --package statsmodels
```
**唯一复现命令约定**

- Python：`python 问题1_求解.py --seed 42`，在 `PROJECT_ROOT` 下直接可执行，一条命令同时产出论文引用的表和图。
- MATLAB：`matlab -batch "main(42)"`，`main.m` 内部用 `fullfile` 定位路径，不依赖当前工作目录。
- 命令、种子、参数、哈希唯一；浮点跨平台差异以该命令所在平台为准，写进论文脚注。

## 检查清单

- [ ] 求解器返回标志已检查（`success`/`status`/`exitflag`/`res.CV`），失败信息连命令一起保留；约束已化标准形，max→min 取负与 `g(x) ≤ 0` 方向记进参数表。
- [ ] 归一化参数（mean/std/min/max、单位）随模型保存，预测阶段复用同一套；条件数 <1e7，或已改用 `lstsq`/`pinv`/正则化，协方差非正定时已加扰动。
- [ ] 种子固定且写入清单，启发式给出多种子分布；大规模数据的分块/稀疏/抽样方式与阈值已记录。
- [ ] 结果做了量纲、符号、数量级与边界（全零入→零出）核对，无 NaN/inf。
- [ ] MATLAB 端 `rng`、`exitflag`、`fullfile` 齐全，图中不出现 `grid on`。
- [ ] 图全部由代码导出（SVG + 300 DPI PNG），未手工改图，并跑过 `figure_audit.py --strict`。
- [ ] 复现清单含运行版本、种子、参数、输入 SHA-256、唯一命令。

## 与数模三角色的衔接

- **建模手 → 编程手**：交接件是模型族、目标与约束的标准形、参数表、验证口径（`roles/建模手/references/前置合同.md`）。本技能只负责「标准形 → API」，不反推模型。
- **编程手主表**：本技能是选库与写代码的主表；依赖检查、稳健性九条、P1/P2 门禁按 `roles/编程手/references/工作流程.md` 第二、三、四、九节执行，自检用 `roles/编程手/references/质检清单.md`。
- **MATLAB 路径**：语言选择、`arguments` 校验、`rng`、`exitflag`、出版绘图门禁全照 `roles/编程手/references/MATLAB规范.md`，MATLAB 不是 Python 的附录。
- **论文手与回流**：本技能只提供方法节要的函数名与版本号，公式、符号、单位以 `术语表格.md` 为准；实现层问题留编程手，公式与参数合同矛盾带命令、堆栈、预期—实际证据回建模手。

## 深读索引

路径相对 `packages/dsh-math-modeling/assets/`。

| 主题 | 路径 | 直接读哪节 |
|---|---|---|
| 库与算法族总目录、按特征跳转 | `algorithms/README.md`、`references/算法索引.md` | 七类核心算法表；算法索引全表（先查这里再加载单文件） |
| 优化（LP/IP/DP/元启发/多目标/鲁棒） | `algorithms/01-优化算法说明.md` | §1 §2 §4 §5 §8 §14 的「代码实现要点」 |
| 预测（灰色/回归/NN/SVM/ARIMA/Prophet/树模型） | `algorithms/02-预测类算法说明.md` | §1 §3 §5 §6 §7 §9 |
| 评价（AHP/熵权/TOPSIS/GRA/RSR/DEA/区间数） | `algorithms/03-评价类算法说明.md` | §1 §3 §4 §9 §10 §12 |
| 图论（最短路/MST/网络流/关键路径/匹配） | `algorithms/04-图论与网络分析算法说明.md` | §1 §2 §3 §4 §6 |
| 统计（预处理/聚类/检验/PCA/FA/NMF） | `algorithms/05-统计分析与数据处理算法说明.md` | §1 §2 §3 §4 |
| 综合（蒙特卡洛/排队/博弈/CA/马尔可夫/ODE） | `algorithms/06-综合类算法说明.md` | §1 §2 §5 §6 |
| 机器学习（LR/树/KNN/NB/SVM/RF/AdaBoost/iForest） | `algorithms/07-机器学习算法说明.md` | §1 §6 §7 §8 |
| 编程手工作流程、MATLAB 规范与自检 | `roles/编程手/references/工作流程.md`、`roles/编程手/references/MATLAB规范.md`、`roles/编程手/references/质检清单.md` | 稳健性九条；`arguments`/`rng`/`exitflag`；P2 终检 |
| 依赖检查、复现清单、绘图与图件审计脚本 | `roles/编程手/scripts/check_env.py`、`roles/编程手/scripts/repro_manifest.py`、`roles/编程手/scripts/plot_style.py`、`roles/编程手/scripts/figure_audit.py` | `FEATURES` 白名单；CLI 与 schema；`apply_publication_style`；`--strict` |
| 可视化执行链 | `tools/figure/SKILL.md` | 数据剖析 → 图表契约 → 选图 → 自检 → 导出 |
| scikit-learn / statsmodels | `vendor/scientific/scikit-learn/SKILL.md`、`vendor/scientific/statsmodels/SKILL.md` | Pipelines 与评估；陷阱 15 条、时序工作流 |
| sympy / networkx / pymoo / simpy | `vendor/scientific/sympy/SKILL.md`、`vendor/scientific/networkx/SKILL.md`、`vendor/scientific/pymoo/SKILL.md`、`vendor/scientific/simpy/SKILL.md` | 求解器选择与 `lambdify`；分析契约；`F`/`G`/`CV` 契约；有界执行 |
| matplotlib / seaborn / aeon / 不确定度与单位 | `vendor/scientific/matplotlib/SKILL.md`、`vendor/scientific/seaborn/SKILL.md`、`vendor/scientific/aeon/SKILL.md`、`vendor/scientific/uncertainty-and-units/SKILL.md` | OO 接口与 `Agg`；`errorbar`；时序任务边界；非协商工作流 11 条 |
| 全库技能目录 | `vendor/scientific/catalog-skills.md` | 按域检索 177 个技能的条目名 |

**同目录下还有哪些可用技能**（与本技能互补）：`vendor/scientific/statistical-analysis/SKILL.md`（检验选择、效应量、APA 报告）、`vendor/scientific/exploratory-data-analysis/SKILL.md`（有界 EDA、缺失与泄漏审查）、`vendor/scientific/scientific-visualization/SKILL.md`（多面板、无障碍配色、期刊导出审计）、`vendor/scientific/paper-lookup/SKILL.md`（18 个文献 API，找参考文献与 DOI）、`vendor/scientific/scientific-writing/SKILL.md` 与 `vendor/scientific/peer-review/SKILL.md`（写作与自审）。目录里另有 PyMC、Dask、Polars、GeoPandas 等条目，本仓库未落地对应文件，需要时先按 `vendor/scientific/catalog-skills.md` 的条目名确认再取。

## 常见失败模式

1. **max 直接塞进 `linprog`**：返回负的最优值，论文里写成负收益。要么显式取负并在参数表记一笔，要么用 `-c` 求解后取 `-fun`。
2. **预处理在 Pipeline 外做**：先全量 `fit_transform` 再切分，交叉验证分数虚高；`StandardScaler` 只能 `fit` 训练折。
3. **把 `res.F is None` 当成空 Pareto 前沿**：`pymoo` 无可行解时 `X`/`F` 为 `None`，先看 `res.CV` 与约束符号；`return_least_infeasible=True` 拿到的是不可行候选，不能叫可行解。
4. **刚性方程硬上 RK45**：步长塌缩、耗时爆炸或结果失真；换 `BDF`/`LSODA`，MATLAB 端换 `ode15s`。
5. **`simpy` 无界运行**：不带 `until` 的 `env.run()` 或 `yield env.timeout(0)` 轮询会挂死；必须同时给时间上限与实体/事件上限。
6. **ARIMA 与手工差分重复**：`d` 已处理过一次差分，再手工 `diff` 就是过差分，预测方差虚大。
7. **array 模型忘 `add_constant`**：statsmodels 的 `OLS`/`GLM`/`Logit` 用数组输入不自带截距，漏了会让 R² 与系数同时失真；而 `OrderedModel`/`ConditionalLogit` 反而不能加常数。
8. **`curve_fit` 忘 `absolute_sigma=True`**：`pcov` 被 reduced chi-square 重标，实测可有 30% 量级差异；`sigma` 是真标准不确定度时必须打开。
9. **熵权法输入含负值或未正向化**：`log` 出 NaN、权重无意义；先正向化、平移为非负，再归一化。
10. **图靠 `plt.show()` 或低 DPI 交付**：论文图不可用；一律 `dpi=300` + SVG，并跑 `figure_audit.py --strict`。

> 来源整合：scientific-agent-skills（scikit-learn、statsmodels、sympy、networkx、pymoo、simpy、matplotlib、seaborn、aeon、uncertainty-and-units）、math-modeling-skill（roles/编程手、assets/算法库）；许可见 assets/NOTICE.md。
