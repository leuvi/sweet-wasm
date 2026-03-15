import init, { blur, oil_painting, infrared, night_vision, grayscale } from 'wasm-lib'

const fns: Record<string, Function> = { blur, oil_painting, infrared, night_vision, grayscale }

let ready = false
const pending: MessageEvent[] = []

init().then(() => {
  ready = true
  pending.forEach(handleMessage)
  pending.length = 0
  self.postMessage({ type: 'ready' })
}).catch((err: any) => {
  self.postMessage({ type: 'init_error', error: err.message || String(err) })
})

function handleMessage(e: MessageEvent) {
  const { id, fn, args } = e.data
  try {
    // ArrayBuffer → Uint8Array for wasm functions
    const resolvedArgs = args.map((arg: any) =>
      arg instanceof ArrayBuffer ? new Uint8Array(arg) : arg
    )
    const result = fns[fn](...resolvedArgs)

    // Uint8Array result → transfer buffer back
    if (result instanceof Uint8Array) {
      const buffer = result.buffer as ArrayBuffer
      ;(self as unknown as Worker).postMessage({ type: 'result', id, result: buffer }, [buffer])
    } else {
      self.postMessage({ type: 'result', id, result })
    }
  } catch (err: any) {
    self.postMessage({ type: 'error', id, error: err.message })
  }
}

self.onmessage = (e: MessageEvent) => {
  if (!ready) {
    pending.push(e)
    return
  }
  handleMessage(e)
}
