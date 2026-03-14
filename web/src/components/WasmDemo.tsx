import { useState, useEffect } from 'react'
import { useWasm } from '../hooks/useWasm'

export function WasmDemo() {
  const { callWorker, callMain, loaded, loading, error, retry } = useWasm()
  const [name, setName] = useState('World')
  const [fibN, setFibN] = useState(10)
  const [greetResult, setGreetResult] = useState('')
  const [fibWorkerResult, setFibWorkerResult] = useState<number | null>(null)

  // Worker 线程调用（异步）
  useEffect(() => {
    if (!loaded) return
    callWorker<string>('greet', name).then(setGreetResult)
  }, [loaded, name, callWorker])

  useEffect(() => {
    if (!loaded) return
    callWorker<number>('fibonacci', fibN).then(setFibWorkerResult)
  }, [loaded, fibN, callWorker])

  if (loading) return <p>Loading WASM module...</p>
  if (error) return (
    <div className="error">
      <p>Failed to load WASM: {error}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )
  if (!loaded) return null

  return (
    <div className="wasm-demo">
      <section className="demo-section">
        <h2>greet() — Worker</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name"
        />
        <p className="result">{greetResult}</p>
      </section>

      <section className="demo-section">
        <h2>add() — Main Thread</h2>
        <p className="result">add(2, 3) = {callMain<number>('add', 2, 3)}</p>
        <p className="result">add(100, 200) = {callMain<number>('add', 100, 200)}</p>
      </section>

      <section className="demo-section">
        <h2>fibonacci() — Worker</h2>
        <input
          type="number"
          value={fibN}
          onChange={(e) => setFibN(Number(e.target.value))}
          min={0}
          max={40}
        />
        <p className="result">fibonacci({fibN}) = {fibWorkerResult}</p>
      </section>
    </div>
  )
}
