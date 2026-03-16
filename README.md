# WASM Workspace

Rust WebAssembly + React 前端双项目工作区。

## 项目结构

```
wasm/
├── wasm-lib/          # Rust WASM 库
│   └── src/
│       ├── lib.rs     # 入口，模块导入 + init
│       ├── image.rs   # 图像处理（blur, oil_painting）
│       ├── video.rs   # 视频特效（infrared, night_vision, grayscale）
│       └── utils.rs   # panic hook
├── web/               # Vite + React + TS 前端
│   └── src/
│       ├── components/
│       │   ├── ImageEffects.tsx   # 图像处理 UI
│       │   └── VideoEffects.tsx   # 实时视频特效 UI
│       ├── hooks/useWasm.ts       # WASM 加载 hook + 状态管理
│       └── workers/
│           ├── WasmBridge.ts      # 主线程/Worker 双模式桥接
│           └── wasm.worker.ts     # Web Worker
├── CLAUDE.md
└── TODO.md
```

## wasm-lib

Rust WASM 图像/视频处理库，使用 `wasm-bindgen` 导出函数。

**图像处理（`image.rs`）— 邻域计算，适合静态图片：**
- `blur(data, w, h, radius)` — 高斯模糊（box blur 两趟）
- `oil_painting(data, w, h, radius)` — 油画效果（Kuwahara 滤镜）

**视频特效（`video.rs`）— 逐像素，适合实时处理：**
- `infrared(data, w, h, intensity)` — 红外热成像
- `night_vision(data, w, h, brightness)` — 夜视仪
- `grayscale(data, w, h, contrast)` — 黑白

**构建：**
```bash
cd wasm-lib
wasm-pack build --target web
```

## web

Vite + React + TypeScript 前端，通过 Web Worker 调用 WASM，支持零拷贝 ArrayBuffer 传输。

**技术栈：** React 19, TypeScript, Zustand, SCSS

**功能：**
- 图片上传 → 应用模糊 / 红外 / 油画效果
- 摄像头或视频文件 → 实时特效（红外、夜视、黑白、模糊）

**启动：**
```bash
cd web
pnpm install
pnpm dev
```

访问 http://localhost:8050

## 调用流程

```
┌─ 构建阶段 ──────────────────────────────────────────────────┐
│                                                              │
│  Rust src (.rs)                                              │
│       │                                                      │
│       ▼  wasm-pack build --target web                        │
│  wasm-lib/pkg/                                               │
│       ├── wasm_lib_bg.wasm    ← 编译后的 WASM 二进制         │
│       ├── wasm_lib.js         ← JS 胶水代码（init + 函数）   │
│       └── wasm_lib.d.ts       ← TS 类型声明                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
        │
        │  vite.config.ts 配置 alias: 'wasm-lib' → '../wasm-lib/pkg'
        │  vite-plugin-wasm 让 .wasm 文件作为 ES 模块直接 import
        ▼
┌─ 运行时 ─────────────────────────────────────────────────────┐
│                                                              │
│  ┌── 主线程 ──────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  React 组件（ImageEffects / VideoEffects）              │  │
│  │       │                                                │  │
│  │       │ useWasm() hook 获取 callWorker 方法             │  │
│  │       ▼                                                │  │
│  │  callWorker('blur', [buffer, w, h, r], [buffer])       │  │
│  │       │                 ▲                              │  │
│  │       │ postMessage     │ onmessage                    │  │
│  │       │ (Transferable)  │ (Transferable)               │  │
│  │       │ ← 零拷贝传输 → │                              │  │
│  └───────┼─────────────────┼──────────────────────────────┘  │
│          │  WasmBridge.ts  │                                  │
│          │  管理 Worker    │                                  │
│          │  Promise 回调   │                                  │
│          ▼                 │                                  │
│  ┌── Web Worker ───────────┼──────────────────────────────┐  │
│  │                         │                              │  │
│  │  wasm.worker.ts         │                              │  │
│  │       │                 │                              │  │
│  │  1. import init, { blur, ... } from 'wasm-lib'         │  │
│  │  2. init() → 加载并实例化 .wasm                        │  │
│  │  3. 收到消息 → ArrayBuffer 转 Uint8Array               │  │
│  │  4. 调用 WASM 函数（blur/infrared/...）                │  │
│  │  5. 结果 Uint8Array.buffer 零拷贝传回主线程 ───────────│  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**关键设计：**
- WASM 在 Web Worker 中运行，不阻塞主线程 UI 渲染
- 图像数据通过 `Transferable ArrayBuffer` 在主线程与 Worker 间传递，零内存拷贝
- `WasmBridge` 单例管理 Worker 生命周期，封装 `postMessage` / `onmessage` 为 Promise 接口
- 视频场景下，`requestAnimationFrame` 循环逐帧取画面 → 传 Worker 处理 → 回写 Canvas

## 快速开始

```bash
# 1. 构建 WASM
cd wasm-lib && wasm-pack build --target web

# 2. 启动前端
cd ../web && pnpm install && pnpm dev
```
