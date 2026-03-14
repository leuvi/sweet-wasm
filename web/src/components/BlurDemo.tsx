import { useState, useRef, useCallback } from 'react'
import { useWasm } from '../hooks/useWasm'

export function BlurDemo() {
  const { callWorker, loaded } = useWasm()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [radius, setRadius] = useState(5)
  const [processing, setProcessing] = useState(false)
  const originalDataRef = useRef<ImageData | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !canvasRef.current) return

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      originalDataRef.current = ctx.getImageData(0, 0, img.width, img.height)
      URL.revokeObjectURL(objectUrlRef.current!)
      objectUrlRef.current = null
    }
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    img.src = url
  }, [])

  const applyBlur = useCallback(async () => {
    if (!canvasRef.current || !originalDataRef.current || !loaded) return

    setProcessing(true)
    try {
      const { width, height, data } = originalDataRef.current
      const input = Array.from(data)

      const result = await callWorker<number[]>('blur', input, width, height, radius)

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.createImageData(width, height)
      imageData.data.set(new Uint8ClampedArray(result))
      ctx.putImageData(imageData, 0, 0)
    } finally {
      setProcessing(false)
    }
  }, [callWorker, loaded, radius])

  const resetImage = useCallback(() => {
    if (!canvasRef.current || !originalDataRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(originalDataRef.current, 0, 0)
  }, [])

  return (
    <section className="demo-section">
      <h2>blur() — Worker</h2>
      <div className="blur-controls">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <label>
          Radius: {radius}
          <input
            type="range"
            min={1}
            max={20}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
        <button onClick={applyBlur} disabled={processing || !originalDataRef.current}>
          {processing ? 'Processing...' : 'Apply Blur'}
        </button>
        <button onClick={resetImage} disabled={processing}>
          Reset
        </button>
      </div>
      <canvas ref={canvasRef} className="blur-canvas" />
    </section>
  )
}
