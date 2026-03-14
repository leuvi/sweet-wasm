/// <reference types="vite/client" />

declare module 'wasm-lib' {
  export function greet(name: string): string
  export function add(a: number, b: number): number
  export function fibonacci(n: number): number
  export function blur(data: Uint8Array, width: number, height: number, radius: number): Uint8Array
  export default function init(): Promise<void>
}
