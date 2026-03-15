/// <reference types="vite/client" />

declare module 'wasm-lib' {
  export function blur(data: Uint8Array, width: number, height: number, radius: number): Uint8Array
  export function oil_painting(data: Uint8Array, width: number, height: number, radius: number): Uint8Array
  export function infrared(data: Uint8Array, width: number, height: number, intensity: number): Uint8Array
  export function night_vision(data: Uint8Array, width: number, height: number, brightness: number): Uint8Array
  export function grayscale(data: Uint8Array, width: number, height: number, contrast: number): Uint8Array
  export default function init(): Promise<void>
}
