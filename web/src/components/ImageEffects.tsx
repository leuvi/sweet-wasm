import { useState, useRef, useCallback } from 'react'
import { useWasm } from '../hooks/useWasm'

type Effect = 'blur' | 'infrared' | 'oil_painting'

export function ImageEffects() {
  const { callWorker, loaded } = useWasm()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [processing, setProcessing] = useState(false)
  const [blurRadius, setBlurRadius] = useState(5)
  const [infraredIntensity, setInfraredIntensity] = useState(1.0)
  const [oilRadius, setOilRadius] = useState(3)
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

  const applyEffect = useCallback(async (effect: Effect) => {
    if (!canvasRef.current || !originalDataRef.current || !loaded) return

    setProcessing(true)
    try {
      const { width, height, data } = originalDataRef.current
      const buffer = data.buffer.slice(0) as ArrayBuffer

      let result: ArrayBuffer
      if (effect === 'blur') {
        result = await callWorker<ArrayBuffer>('blur', [buffer, width, height, blurRadius], [buffer])
      } else if (effect === 'infrared') {
        result = await callWorker<ArrayBuffer>('infrared', [buffer, width, height, infraredIntensity], [buffer])
      } else {
        result = await callWorker<ArrayBuffer>('oil_painting', [buffer, width, height, oilRadius], [buffer])
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.createImageData(width, height)
      imageData.data.set(new Uint8ClampedArray(result))
      ctx.putImageData(imageData, 0, 0)
    } finally {
      setProcessing(false)
    }
  }, [callWorker, loaded, blurRadius, infraredIntensity, oilRadius])

  const resetImage = useCallback(() => {
    if (!canvasRef.current || !originalDataRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    ctx.putImageData(originalDataRef.current, 0, 0)
  }, [])

  const hasImage = originalDataRef.current !== null

  return (
    <section className="demo-section">
      <h2>Image Effects — Worker</h2>
      <div className="blur-controls">
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      <div className="blur-controls">
        <label>
          Blur Radius: {blurRadius}
          <input
            type="range"
            min={1}
            max={20}
            value={blurRadius}
            onChange={(e) => setBlurRadius(Number(e.target.value))}
          />
        </label>
        <button onClick={() => applyEffect('blur')} disabled={processing || !hasImage}>
          {processing ? 'Processing...' : 'Apply Blur'}
        </button>
      </div>

      <div className="blur-controls">
        <label>
          Intensity: {infraredIntensity.toFixed(1)}
          <input
            type="range"
            min={0.2}
            max={2.0}
            step={0.1}
            value={infraredIntensity}
            onChange={(e) => setInfraredIntensity(Number(e.target.value))}
          />
        </label>
        <button onClick={() => applyEffect('infrared')} disabled={processing || !hasImage}>
          {processing ? 'Processing...' : 'Apply Infrared'}
        </button>
      </div>

      <div className="blur-controls">
        <label>
          Brush Size: {oilRadius}
          <input
            type="range"
            min={1}
            max={10}
            value={oilRadius}
            onChange={(e) => setOilRadius(Number(e.target.value))}
          />
        </label>
        <button onClick={() => applyEffect('oil_painting')} disabled={processing || !hasImage}>
          {processing ? 'Processing...' : 'Apply Oil Paint'}
        </button>
      </div>

      <div className="blur-controls">
        <button onClick={resetImage} disabled={processing}>
          Reset
        </button>
      </div>

      <canvas ref={canvasRef} className="blur-canvas" />
    </section>
  )
}
