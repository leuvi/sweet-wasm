import init, { greet, add, fibonacci, blur } from 'wasm-lib'

const fns: Record<string, Function> = { greet, add, fibonacci, blur }

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
    const result = fns[fn](...args)
    self.postMessage({ type: 'result', id, result })
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
