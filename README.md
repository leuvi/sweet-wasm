# WASM Workspace

Rust WebAssembly + React 前端双项目工作区。

## 项目结构

```
wasm/
├── wasm-lib/   # Rust WASM 库
└── web/        # Vite + React + TS 前端
```

## wasm-lib

Rust WebAssembly 通用模板项目，使用 `wasm-bindgen` 导出函数供 JS 调用。

**示例函数：**
- `greet(name)` — 字符串处理
- `add(a, b)` — 数值计算
- `fibonacci(n)` — 递推计算

**构建：**
```bash
cd wasm-lib
wasm-pack build --target web
```

构建产物输出到 `wasm-lib/pkg/`。

## web

Vite + React + TypeScript 前端项目，用于预览和调用 WASM 模块。

**技术栈：** React 19, TypeScript, Zustand, Axios, SCSS

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
