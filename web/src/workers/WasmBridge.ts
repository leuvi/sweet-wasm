type Callback = {
  resolve: (value: any) => void
  reject: (reason: any) => void
}

class WasmBridge {
  private worker: Worker | null = null
  private wasmModule: Record<string, Function> | null = null
  private callId = 0
  private callbacks = new Map<number, Callback>()
  private initPromise: Promise<void> | null = null

  /** 同时初始化主线程 WASM 和 Worker */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = Promise.all([
      this.initMain(),
      this.initWorker(),
    ]).then(() => {}).catch((err) => {
      this.cleanup()
      throw err
    })

    return this.initPromise
  }

  /** 主线程同步调用（轻量计算用） */
  callMain<T = any>(fn: string, ...args: any[]): T {
    if (!this.wasmModule) throw new Error('WASM not initialized, call init() first')
    const func = this.wasmModule[fn]
    if (!func) throw new Error(`WASM function "${fn}" not found`)
    return func(...args) as T
  }

  /** Worker 线程异步调用（耗时计算用） */
  callWorker<T = any>(fn: string, args: any[], transfers?: Transferable[]): Promise<T> {
    if (!this.worker) throw new Error('Worker not initialized, call init() first')
    const id = this.callId++
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject })
      this.worker!.postMessage({ id, fn, args }, transfers ?? [])
    })
  }

  terminate() {
    this.cleanup()
  }

  /** 统一清理：terminate Worker、清空状态，允许后续重试 */
  private cleanup() {
    this.worker?.terminate()
    this.worker = null
    this.wasmModule = null
    this.initPromise = null
    this.callbacks.forEach((cb) => cb.reject(new Error('Worker terminated')))
    this.callbacks.clear()
  }

  private async initMain(): Promise<void> {
    const wasm = await import('wasm-lib')
    await wasm.default()
    const { default: _init, ...fns } = wasm
    this.wasmModule = fns as Record<string, Function>
  }

  private initWorker(): Promise<void> {
    this.worker = new Worker(
      new URL('../workers/wasm.worker.ts', import.meta.url),
      { type: 'module' },
    )

    this.worker.addEventListener('message', (e: MessageEvent) => {
      const { type, id, result, error } = e.data
      if (type !== 'result' && type !== 'error') return
      const cb = this.callbacks.get(id)
      if (!cb) return
      this.callbacks.delete(id)
      type === 'result' ? cb.resolve(result) : cb.reject(new Error(error))
    })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WASM Worker initialization timed out'))
      }, 15000)

      const onMessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', onMessage)
          resolve()
        } else if (e.data.type === 'init_error') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', onMessage)
          reject(new Error(e.data.error))
        }
      }
      this.worker!.addEventListener('message', onMessage)
    })
  }
}

export const wasmBridge = new WasmBridge()
