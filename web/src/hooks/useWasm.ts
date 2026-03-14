import { useEffect, useCallback } from 'react'
import { useWasmStore } from '../store/useWasmStore'
import { wasmBridge } from '../workers/WasmBridge'

export function useWasm() {
  const { loaded, loading, error, setLoaded, setLoading, setError } = useWasmStore()

  useEffect(() => {
    if (loaded || loading) return

    setLoading(true)

    wasmBridge.init()
      .then(() => setLoaded())
      .catch((err) => setError(err.message))
  }, [loaded, loading, setLoaded, setLoading, setError])

  /** Worker 线程调用（异步，不阻塞 UI） */
  const callWorker = useCallback(
    <T = any>(fn: string, ...args: any[]): Promise<T> => {
      return wasmBridge.callWorker<T>(fn, ...args)
    },
    [],
  )

  /** 主线程调用（同步，适合轻量计算） */
  const callMain = useCallback(
    <T = any>(fn: string, ...args: any[]): T => {
      return wasmBridge.callMain<T>(fn, ...args)
    },
    [],
  )

  return { callWorker, callMain, loaded, loading, error }
}
