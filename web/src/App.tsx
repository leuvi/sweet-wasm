import { ImageEffects } from './components/ImageEffects'
import { VideoEffects } from './components/VideoEffects'

function App() {
  return (
    <div className="app">
      <h1>Rust WASM + React</h1>
      <ImageEffects />
      <VideoEffects />
    </div>
  )
}

export default App
