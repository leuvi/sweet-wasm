import { useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { wasmBridge } from '../workers/WasmBridge'

const useWasmStore = create<{
  loaded: boolean
  loading: boolean
  error: string | null
}>(() => ({
  loaded: false,
  loading: false,
  error: null,
}))

export function useWasm() {
  const { loaded, loading, error } = useWasmStore()

  useEffect(() => {
    if (loaded || loading || error) return

    useWasmStore.setState({ loading: true })

    wasmBridge.init()
      .then(() => useWasmStore.setState({ loaded: true, loading: false }))
      .catch((err) => useWasmStore.setState({ error: err.message, loading: false }))
  }, [loaded, loading, error])

  const retry = useCallback(() => {
    useWasmStore.setState({ loaded: false, loading: false, error: null })
  }, [])

  const callWorker = useCallback(
    <T = any>(fn: string, args: any[], transfers?: Transferable[]): Promise<T> => {
      return wasmBridge.callWorker<T>(fn, args, transfers)
    },
    [],
  )

  const callMain = useCallback(
    <T = any>(fn: string, ...args: any[]): T => {
      return wasmBridge.callMain<T>(fn, ...args)
    },
    [],
  )

  return { callWorker, callMain, loaded, loading, error, retry }
}
