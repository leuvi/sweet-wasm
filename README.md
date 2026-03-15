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

访问 http://localhost:5173

## 快速开始

```bash
# 1. 构建 WASM
cd wasm-lib && wasm-pack build --target web

# 2. 启动前端
cd ../web && pnpm install && pnpm dev
```
