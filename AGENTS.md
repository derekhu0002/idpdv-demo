# AGENTS.md —— IDPDV demo 工作区 Agent 作业规范

本文件是本工作区（`D:\Projects\idpdv-demo`）的**项目级**作业规范，与全局
`~/.config/opencode/AGENTS.md`（ArchGraph / ARGO 全局工作流规则）叠加生效；冲突时以全局规则为准。

## 0. 启动门（每次会话第一步，不可跳过）

1. 用 `queryNeo4jGraph {schema:true}` 解析本工作区 schema 与 `actorElementType`；本工作区 actor 类型为
   `Business Actor`，默认主 Actor 为 `项目经理`（`project-manager-001`）。
2. 恢复记忆：只加载 T1 工作记忆摘要 + 最近/活跃的记忆卡 + 上次会话钩子（本工作区记忆视图：
   `project-manager-001-wm-001` / `-ltm-001`）。
3. 确认 ARGO MCP 服务的是**本工作区**图谱（`design/KG/SystemArchitecture.json`，数据库 `idpdv-demo`）。
   若 MCP 的主工作区不是本目录，**停止并报告**——跨工作区写入会被拒绝。

## 1. 铁律（与全局规则一致，摘录）

1. **架构先行**：改任何东西前，先在意图图中定位（或创建）对应元素与视图。
2. **只经 ARGO MCP 读写图谱**：禁止直接编辑 `design/KG/SystemArchitecture.json`。
3. **提交后登记**：git 提交后，把 commit id + 相关文件路径登记回对应图谱元素。
4. **验收先行**：改动前先明确受影响元素的验收用例，缺失则先补，再实现；改动后回归全绿。
5. **结束前写长期记忆**。
6. **KG-first**：内容以意图图为准，仓库/文档为其投影。

## 2. 项目背景（Agent 必读）

- **任务**：把开源安卓应用 **`android/architecture-samples`（Todo，Kotlin，Apache-2.0）** 移植（**重写**）
  为鸿蒙应用（**ArkTS / ArkUI**），最终在本机 **HarmonyOS 模拟器**运行。
- **不是转译**：Android(Compose/XML) → HarmonyOS(ArkUI) 是重写。把源应用当 **Spec 源**：
  抽取其*功能、界面、数据模型、交互*为需求与用例，再实现。
- **工具链**：DevEco Studio `C:\Program Files\Huawei\DevEco Studio`；SDK 自带 `node`/`ohpm`/`hvigorw`/`hdc`；
  构建命令经 `hvigorw`；运行/安装经 `hdc`。
- **本机实测路径**（已勘察）：
  - DevEco Studio 安装：`C:\Program Files\Huawei\DevEco Studio`（自带 `tools\hvigor`、`tools\ohpm`、`tools\hdc`、`tools\emulator\Emulator.exe`）。
  - 用户级 SDK：`D:\tools\Huawei\Sdk`（含 `system-image`、`licenses`）。
  - DevEco 用户数据：`D:\tools\Huawei\DevEcoStudio6.1`。
  - **模拟器已部署**：`D:\tools\Huawei\Emulator\deployed`（设备含 `Pura 901`（已部署 `system.img.qcow2`/`vendor.img.qcow2`/`userdata.img.qcow2`/`cache.img.qcow2`）、`Mate X7`、`MatePad Pro 13`、`MateBook Pro`）。
- **模拟器风险**：镜像已部署，但启动依赖主机虚拟化（Hyper-V/WHPX 等）；若启动失败须明确报告，不得假装已运行。

## 3. IPD 全量设计四阶段（作业主线）

| 阶段 | 编号 | 关口 | 主要产出（本体类型） |
|---|---|---|---|
| 领域分析与方案设计 | 1.9.3.1 | Charter | `领域架构`、`场景`、`需求`(RR/IR)、方案 |
| 系统需求分析 | 1.9.3.2 | TR1 | `需求`(SR)、`场景`/`用例`、`特性`、`设计规格`(SDR) |
| 架构与系统设计 | 1.9.3.3 | TR2 | `需求`(AR)、`功能`、`逻辑元素`、`实现元素`、`部件` |
| 架构与设计实现支撑 | 1.9.3.4 | TR4A/TR5/TR6 | `软件单元`、`软件包`、`测试用例`/`测试因子`/`测试结果`、`缺陷`/`补丁` |

- 每阶段 = 一个 `IPD 阶段` 元素；活动 = `IPD 活动`；关口 = `决策评审点`/`技术评审点`。
- 数据链：`RR→IR→SR→AR`（`派生`）；`场景—覆盖—用例`；`功能—派生—逻辑/实现元素—派生—软件单元`；
  `测试用例—验证—SR`；`缺陷—变更—软件单元`。
- 阶段推进与关口放行用 `Triggering`；评审用 `评审`。

## 4. 交付定义（Definition of Done）

1. 图谱：四阶段流程模型 + 需求/设计/实现/测试资产 + 追溯边完整；`validateSystemArchitecture` 通过。
2. 代码：一个 DevEco 鸿蒙工程（ArkTS/ArkUI），功能覆盖源 Todo 应用；`hvigorw assembleHap` 构建成功。
3. 测试：`node tests/*.test.js` 全绿；应用在 HarmonyOS 模拟器可运行（或明确报告模拟器阻塞）。
4. 版本：所有产出已 git 提交，commit id 已登记回图谱元素。

## 5. 委派与协作

- 默认以 `项目经理`（`project-manager-001`）身份作业；需要时按全局 `<CoperationGuideline>` 在图中创建
  `Business Actor` 并委派（读其 `agent` 属性决定 Agent 类型）。
- 保持各 Actor 记忆隔离：其长期记忆为 `parent_element_id` 指向该 Actor 的子视图层级。
