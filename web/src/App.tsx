import { WasmDemo } from './components/WasmDemo'
import { BlurDemo } from './components/BlurDemo'

function App() {
  return (
    <div className="app">
      <h1>Rust WASM + React</h1>
      <WasmDemo />
      <BlurDemo />
    </div>
  )
}

export default App
