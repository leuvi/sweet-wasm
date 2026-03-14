# 项目审查报告

日期：2026-03-14
范围：`wasm-lib/` 与 `web/`（只读审查，无代码改动）

> 说明：本文件保留第一次 Review 全量内容，不删除；并在文末追加第二次 Review 结果与待优化项。

## 第一次 Review 结论概览（保留，不删除）

- 生产构建和基础单元测试可通过。
- 存在 1 个高风险问题、4 个中风险问题，主要集中在 WASM 初始化失败兜底、异步异常收敛、资源释放与边界输入策略。

## 第一次 Review 发现（按严重级别，保留）

### 1. 高风险：WASM 初始化失败时可能永久 Loading

- 文件：`web/src/hooks/useWasm.ts:11`
- 文件：`web/src/workers/WasmBridge.ts:74`
- 文件：`web/src/workers/wasm.worker.ts:8`

问题描述：
- 前端先 `setLoading(true)`，随后依赖 `wasmBridge.init()` 完成。
- `initWorker()` 的 Promise 仅在收到 `ready` 时 `resolve`，没有 `reject` 或超时分支。
- worker 侧 `init()` 也没有 `catch`，若初始化失败不会向主线程回报失败。

影响：
- 一旦 wasm 加载失败，页面可能长期停留在 Loading，缺少恢复路径和错误可观测性。

建议：
- 为 worker 初始化增加失败消息通道（`init_error`）与超时机制。
- 在 bridge 层把初始化失败明确 `reject` 给 `useWasm`，并允许重试。

### 2. 中风险：Blur 异步流程缺少 finally，失败后 UI 可能卡死

- 文件：`web/src/components/BlurDemo.tsx:30`
- 文件：`web/src/components/BlurDemo.tsx:66`

问题描述：
- `applyBlur` 中 `setProcessing(true)` 后未使用 `try/finally`。
- 若 `callWorker('blur', ...)` 抛错，`setProcessing(false)` 不会执行。

影响：
- 按钮状态可能长期处于 `Processing...`/禁用，用户无法继续操作。

建议：
- 使用 `try/catch/finally` 收敛状态，`finally` 中保证 `setProcessing(false)`。

### 3. 中风险：Object URL 未释放，重复上传有内存泄漏

- 文件：`web/src/components/BlurDemo.tsx:24`

问题描述：
- 使用 `URL.createObjectURL(file)` 后未 `URL.revokeObjectURL(...)`。

影响：
- 用户多次上传图片时，浏览器内存会持续增长。

建议：
- 在图片加载完成后释放旧 URL，并在组件卸载时清理。

### 4. 中风险：fibonacci 溢出边界未定义

- 文件：`wasm-lib/src/lib.rs:21`

问题描述：
- `fibonacci` 返回 `u32`，当 `n` 较大（约 `n >= 48`）会溢出。
- 现有测试仅覆盖到 `n=20`。

影响：
- 大输入结果不可信，API 行为缺乏明确契约。

建议：
- 明确策略：限制输入并返回错误，或改 `u64` / BigInt 方案，或采用饱和策略并文档化。

### 5. 中风险：wasm 浏览器测试未在当前命令链中执行

- 文件：`wasm-lib/tests/web.rs:6`

问题描述：
- 该文件使用 `wasm_bindgen_test`，但 `cargo test` 结果显示该测试文件 `running 0 tests`。

影响：
- 关键的 wasm 浏览器行为未纳入实际回归保障。

建议：
- 在 CI 中加入 `wasm-pack test --headless --chrome`（或等价 runner）确保执行。

## 第一次 Review 验证记录（保留）

### 已执行命令

- `cd web && pnpm build`
- `cd wasm-lib && cargo test`

### 结果摘要

- Web 构建成功（Vite 产物正常输出）。
- Rust 单元测试通过（`src/lib.rs` 中 3 个测试通过）。
- `wasm-lib/tests/web.rs` 在当前 `cargo test` 下未执行（显示 0 tests）。

## 备注

- 本报告按你的要求仅做审查，不包含任何代码修改。

## 第二次 Review 结果（本次需优化）

复审时间：2026-03-14（同日增量复审）
范围：基于你“已改动一版”的增量代码进行复核。

### 状态对照（第一次 -> 第二次）

- 已修复：初始化失败无兜底（已新增 `init_error` 与超时）
- 已修复：Blur 缺少 `finally` 导致 UI 可能卡死
- 已修复：Object URL 未释放导致内存泄漏
- 已优化：`fibonacci` 改为饱和加法，避免溢出回绕
- 仍待优化：初始化超时后的 Worker 清理与失败重试策略
- 仍待优化：wasm 浏览器测试未接入实际执行链

### 第二次 Review 发现（按严重级别）

#### 1. 高风险：初始化超时后遗留 Worker，重试会叠加后台线程

- 文件：`web/src/workers/WasmBridge.ts:77`
- 文件：`web/src/workers/WasmBridge.ts:93`
- 文件：`web/src/workers/WasmBridge.ts:63`

问题描述：
- 超时分支只 `reject`，未移除监听且未 `terminate` 当前 Worker。
- 后续再次 `init()` 会新建 Worker，旧 Worker 可能继续存活。

影响：
- 存在后台线程累积、内存/CPU 增长风险，且会增加定位难度。

建议：
- 在超时/初始化失败路径执行统一清理：移除监听、`terminate` Worker、清空引用。
- 对 `initWorker()` 增加幂等失败收敛逻辑，避免重复残留。

#### 2. 中风险：初始化失败后自动快速重试，可能形成错误风暴

- 文件：`web/src/hooks/useWasm.ts:8`
- 文件：`web/src/hooks/useWasm.ts:15`

问题描述：
- 初始化失败后 `loading` 被置回 `false`，effect 条件再次满足，可能立即再次重试。

影响：
- 在持续失败场景（资源不可达/网络异常）下会高频重试，增加资源消耗并干扰排障。

建议：
- 增加重试节流策略（指数退避或上限次数），或改为用户手动触发重试。

#### 3. 中风险：wasm 浏览器测试文件存在，但仍未进入执行链

- 文件：`wasm-lib/tests/web.rs:6`
- 文件：`README.md`

问题描述：
- 复审执行 `cargo test` 仍显示 `tests/web.rs` 为 `running 0 tests`。

影响：
- 浏览器环境下的 wasm 行为仍缺乏自动化回归保障。

建议：
- 在本地脚本与 CI 增加 `wasm-pack test --headless --chrome`（或等价 runner）。
- 在 README 增加“单元测试”和“浏览器 wasm 测试”两条独立命令说明。

### 第二次 Review 验证记录

已执行命令：

- `cd web && pnpm exec tsc --noEmit && pnpm build`
- `cd wasm-lib && cargo test`

结果摘要：

- Web 类型检查与构建通过。
- Rust 单元测试通过。
- `wasm-lib/tests/web.rs` 仍未在 `cargo test` 中执行（显示 0 tests）。
