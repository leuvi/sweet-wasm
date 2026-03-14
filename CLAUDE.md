# CLAUDE.md

## 项目定位

本项目用于探索 Rust WASM 在前端的实际性能优势场景。WASM 不是目的，性能提升才是。

## 核心原则

- 新增功能前，先判断 WASM 是否比原生 JS/浏览器 API 更快
- 如果浏览器已有高度优化的原生实现（如 Canvas 编解码、Web Audio、WebGL），直接告知用户不建议用 WASM，避免本末倒置
- 只在 WASM 有明确性能优势的场景下使用：密集数值循环、逐像素计算、纯算法密集型任务

## 项目结构

- `wasm-lib/` — Rust WASM 库，`wasm-pack build --target web` 构建
- `web/` — Vite + React + TS 前端，通过 Web Worker 调用 WASM

## 开发流程

1. 修改 `wasm-lib/src/` 后执行 `cd wasm-lib && wasm-pack build --target web`
2. 前端 `cd web && pnpm dev` 自动加载更新后的 wasm
3. 新增 wasm 函数需在 `web/src/workers/wasm.worker.ts` 的 `fns` 中注册
