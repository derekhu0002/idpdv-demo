# IDPDV demo —— 开源安卓应用移植为鸿蒙应用（IPD 本体图谱驱动）

> 承载图谱（KG，source of truth）：`design/KG/SystemArchitecture.json`
> 工作区 Schema：`.argo/schema/schema-bundle.config.json` · 公理：`.argo/schema/ontology-axioms.json`
> 本体语言：`ArchiMate 3.2 + IPD 研发领域扩展`（`extends: default`）
> 框架：ArchGraph / ARGO（读写意图图的唯一通道为 ARGO MCP）

本项目是一个**演示工程**：把一个真实的开源安卓应用，按公司 IPD「全量设计」四阶段流程，
完整走一遍 **领域分析 → 系统需求 → 架构与系统设计 → 设计实现支撑**，最终交付一个
**可在本机鸿蒙（HarmonyOS）模拟器上运行的应用**。整个过程用一张语义意图图（本体图谱）
承载需求、设计、实现、测试与追溯关系，并由 Agent 依图作业。

---

## 1. 项目目标

1. **移植（重写）一个开源安卓应用为鸿蒙应用**（ArkTS / ArkUI）。
   源应用：**[`android/architecture-samples`](https://github.com/android/architecture-samples)**（官方 Todo 示例，Kotlin，MVVM，本地存储，Apache-2.0）。
2. **以 IPD 全量设计四阶段流程组织开发**，每阶段设评审门（Charter / TR1 / TR2 / TR4A / TR5 / TR6）。
3. **全程以本体图谱表达**：需求层级 `RR→IR→SR→AR`、场景/用例、功能、部件、实现元素、软/硬件单元、测试资产，
   以及 `派生/追溯/覆盖/验证/变更/影响/评审` 等关系；变更影响可沿图遍历。
4. **可执行验收**：每个要素配 GIVEN-WHEN-THEN 验收用例（`node tests/*.test.js`），图谱变更经 `validateSystemArchitecture` 校验。

> 认知前提：Android(Kotlin/XML/Compose) → HarmonyOS(**ArkTS/ArkUI**) 是**重写**而非机械转译。
> 正确姿势是把源应用当作 **Spec 源**，抽取需求/用例/测试，再在 ArkUI 上实现。

---

## 2. 前置依赖环境

### 2.1 框架依赖（必需）——ArchGraph / ARGO

本项目**不是独立系统**，而是 ArchGraph 框架的一个工作区，依赖其运行时与工具链：

| 依赖 | 说明 |
|---|---|
| **ArchGraph 框架** | 联邦规则、ARGO MCP 工具链、Graph MCP 接口契约。仓库：[derekhu0002/archgraph](https://github.com/derekhu0002/archgraph)。 |
| **ARGO MCP 工具链** | 读写意图图的唯一通道（`getSystemArchitecture` / `getIntentElementContext` / `getArchitectureViewContext` / `queryNeo4jGraph` 读；`addArchitecture*` / `updateArchitecture*` / `removeArchitecture*` / `applySystemArchitectureMutation` 写；`validateSystemArchitecture` / `runArchitectureTests` 校验）。**意图图只能经 MCP 读写，禁止直接编辑 JSON。** |
| **工作区 Schema Bundle** | `.argo/schema/schema-bundle.config.json`（`extends: "default"`）——IPD 研发领域本体（元素类型 + 域关系 + `overrideMatrix` 端点矩阵）。 |
| **联邦中心（Graph Store）** | 跨项目图谱查询 / 镜像托管；跨项目读取返回引用而非副本，未授权默认拒绝。 |

> 重要：ARGO MCP 的**主工作区**由客户端根目录（cwd）解析。要在本项目上作业，必须
> **以本目录为 cwd 启动 opencode / MCP**，该 MCP 才能写入本项目图谱（跨工作区写入被拒）。

### 2.2 运行时与数据依赖

| 依赖 | 用途 | 备注 |
|---|---|---|
| **Neo4j** | 意图图的结构投影（`queryNeo4jGraph` / Graph RAG 语义检索） | 由框架同步维护；数据库名 = 仓库名 `idpdv-demo` |
| **Node.js** | 运行可执行的 GIVEN-WHEN-THEN 验收测试（`node tests/*.test.js`） | 纯 Node，无第三方 npm 依赖 |
| **Enterprise Architect `.qea`** | EA 图模型（SQLite），承载视图图形/几何投影 | 仓库内为 `idpdv-demo.qea` |
| **DevEco Studio + OpenHarmony/HarmonyOS SDK** | 编译、签名、运行鸿蒙应用（ArkTS/ArkUI） | 本机已装：`C:\Program Files\Huawei\DevEco Studio`（SDK `openharmony 6.1.1` + `hms`） |
| **HarmonyOS 模拟器系统镜像** | 在模拟器运行交付物 | ⚠️ 需在 DevEco 内用华为账号登录后下载系统镜像 |
| **Git** | 版本化；提交后把 commit id 登记回图谱元素 | — |

---

## 3. 项目涉及的 IPD 流程 Schema

工作区自定义本体为 **`.argo/schema/schema-bundle.config.json`**（`extends: "default"`），
公理为 **`.argo/schema/ontology-axioms.json`**。激活后 `schemaKind=workspace`。

### 3.1 元素类型（按本体层）

| 本体层 | 代表元素类型 |
|---|---|
| 流程骨架层 | `IPD 阶段`、`IPD 活动`、`决策评审点`、`技术评审点`、`里程碑`、`退出准则`、`交付物`、`需求` |
| 领域资产层 | `设计规格`、`场景`、`用例`、`功能影响点`、`设计方案`、`设计决策`、`部件`、`功能`、`特性`、`领域架构`、`领域系统元素`、`实现元素`、`逻辑元素`、`软件单元`、`硬件单元`、`软件包`、`测试用例`、`测试因子`、`缺陷`、`补丁`、`测试结果`、`配置项`、`变更请求`、`风险` |
| 系统概念模型层 | `目标系统`、`系统`、`系统元素`、`软件元素`、`硬件元素`、`软件实现元素`、`硬件实现元素`、`上下文`、`业务功能`、`DFX功能` |

### 3.2 关系类型

- **ArchiMate 基类**：`Composition`、`Aggregation`、`Assignment`、`Realization`、`Serving`、`Access`、`Influence`、`Triggering`、`Flow`、`Specialization`。
- **域关系**：`评审`、`批准`、`变更`、`替代`、`验证`、`发布`、`追溯`、`派生`、`覆盖`、`影响`、`交互`、`呈现`、`源于`、`归属`、`执行`、`实现为`、`归属于`。

### 3.3 约束

- **端点矩阵**（`overrideMatrix`）：新增域关系须声明「源 ArchiMate 基类 → 允许目标基类」。
- **逻辑公理**（`ontology-axioms.json`）：当前强制 `functionalProperties: ["归属于"]`（每个系统功能至多归属一个部件）；其余预留。
- **属性约束**（`attributesByElementType`）：概念类型的 `质量属性`（DFX）受控词表。
- **图谱级约束**：唯一顶层视图 `SystemArchitecture`；视图元素 ≤ 15；关系两端同址；`statement` 严格为 `源 --(类型)--> 目标`；类型映射到合法 ArchiMate 基类；KG-first 无损写。

---

## 4. 作业流程模型（全量设计）

| 阶段 | 编号 | 关口 |
|---|---|---|
| 领域分析与方案设计 | 1.9.3.1 | Charter |
| 系统需求分析 | 1.9.3.2 | TR1 |
| 架构与系统设计 | 1.9.3.3 | TR2 |
| 架构与设计实现支撑 | 1.9.3.4 | TR4A / TR5 / TR6 |

跨资产数据流（本体关系）：

```
RR --派生--> IR --派生--> SR --派生--> AR
IR --派生--> 场景 --覆盖--> 系统用例
SR --派生--> 特性 / SDR
系统功能 --派生--> 逻辑元素 / 实现元素
实现元素 --派生--> 软件单元 / 硬件单元
测试用例 --验证--> SR ; 测试用例 --派生--> 测试因子 --派生--> 测试结果
缺陷 --变更--> 软件单元 ; 缺陷 --派生--> 补丁
阶段 --触发--> 阶段 ; 评审点 --触发--> 阶段 ; 评审点 --评审--> 资产
```

---

## 5. 仓库结构

```
.argo/schema/schema-bundle.config.json   工作区自定义本体（extends: default）
.argo/schema/ontology-axioms.json        本体公理
design/KG/SystemArchitecture.json        canonical 意图图（source of truth）
design/KG/SystemArchitecture.tombstones.ndjson  删除墓碑账本（可恢复）
design/KG/test-failure-records.json      测试失败记录
tests/ipd_flow_seed.test.js              种子流程模型验收（阶段/评审点/推进链/上下文）
README.md                                本说明
AGENTS.md                                本工作区 Agent 作业规范
docs/                                    分析/规格/设计文档（KG 为权威源，此处为投影）
idpdv-demo.qea                           Enterprise Architect 图模型投影
```

---

## 6. 验收与运行

```bash
node tests/ipd_flow_seed.test.js
# 或单跑某用例锚点：
# ARGO_TESTCASE_ANCHOR=structure node tests/ipd_flow_seed.test.js
```

图谱变更后经 ARGO `validateSystemArchitecture` 校验；提交后将 commit id 登记回对应图谱元素。
鸿蒙工程（DevEco / hvigor）构建与模拟器运行说明在实现阶段补充。
