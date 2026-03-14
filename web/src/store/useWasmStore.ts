import { create } from 'zustand'

interface WasmState {
  loaded: boolean
  loading: boolean
  error: string | null
  setLoaded: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
}

export const useWasmStore = create<WasmState>((set) => ({
  loaded: false,
  loading: false,
  error: null,
  setLoaded: () => set({ loaded: true, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))
