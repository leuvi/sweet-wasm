import { useState, useRef, useCallback, useEffect } from 'react'
import { useWasm } from '../hooks/useWasm'

type Source = 'none' | 'camera' | 'file'

interface EffectConfig {
  label: string
  fn: string
  params: {
    name: string
    label: string
    min: number
    max: number
    step: number
    defaultValue: number
  }[]
}

const EFFECTS: EffectConfig[] = [
  {
    label: 'Infrared',
    fn: 'infrared',
    params: [
      { name: 'intensity', label: 'Intensity', min: 0.2, max: 2.0, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    label: 'Blur',
    fn: 'blur',
    params: [
      { name: 'radius', label: 'Radius', min: 1, max: 20, step: 1, defaultValue: 5 },
    ],
  },
  {
    label: 'Night Vision',
    fn: 'night_vision',
    params: [
      { name: 'brightness', label: 'Brightness', min: 0.5, max: 3.0, step: 0.1, defaultValue: 1.5 },
    ],
  },
  {
    label: 'B&W',
    fn: 'grayscale',
    params: [
      { name: 'contrast', label: 'Contrast', min: 0.5, max: 2.0, step: 0.1, defaultValue: 1.0 },
    ],
  },
]

export function VideoEffects() {
  const { callWorker, loaded } = useWasm()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const processingRef = useRef(false)
  const activeRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const callWorkerRef = useRef(callWorker)

  const [source, setSource] = useState<Source>('none')
  const [active, setActive] = useState(false)
  const [effectIndex, setEffectIndex] = useState(0)
  const [params, setParams] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    EFFECTS.forEach((e) => e.params.forEach((p) => { initial[`${e.fn}.${p.name}`] = p.defaultValue }))
    return initial
  })
  const [fps, setFps] = useState(0)

  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() })
  const effectRef = useRef(EFFECTS[0])
  const paramsRef = useRef(params)

  callWorkerRef.current = callWorker
  effectRef.current = EFFECTS[effectIndex]
  paramsRef.current = params

  const processFrame = useCallback(() => {
    if (!activeRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const hiddenCanvas = hiddenCanvasRef.current

    if (!video || !canvas || !hiddenCanvas || video.paused || video.ended || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame)
      return
    }

    if (processingRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame)
      return
    }

    processingRef.current = true

    const w = video.videoWidth
    const h = video.videoHeight
    if (w === 0 || h === 0) {
      processingRef.current = false
      animFrameRef.current = requestAnimationFrame(processFrame)
      return
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    hiddenCanvas.width = w
    hiddenCanvas.height = h

    const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true })!
    hiddenCtx.drawImage(video, 0, 0, w, h)
    const frame = hiddenCtx.getImageData(0, 0, w, h)
    const buffer = frame.data.buffer.slice(0) as ArrayBuffer

    const effect = effectRef.current
    const currentParams = paramsRef.current
    const args: any[] = [buffer, w, h]
    effect.params.forEach((p) => {
      args.push(currentParams[`${effect.fn}.${p.name}`] ?? p.defaultValue)
    })

    callWorkerRef.current<ArrayBuffer>(effect.fn, args, [buffer])
      .then((result) => {
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.createImageData(w, h)
        imageData.data.set(new Uint8ClampedArray(result))
        ctx.putImageData(imageData, 0, 0)

        const counter = fpsCounterRef.current
        counter.frames++
        const now = performance.now()
        if (now - counter.lastTime >= 1000) {
          setFps(counter.frames)
          counter.frames = 0
          counter.lastTime = now
        }
      })
      .catch(() => {})
      .finally(() => {
        processingRef.current = false
        if (activeRef.current) {
          animFrameRef.current = requestAnimationFrame(processFrame)
        }
      })
  }, [])

  const startProcessing = useCallback(() => {
    activeRef.current = true
    setActive(true)
    fpsCounterRef.current = { frames: 0, lastTime: performance.now() }
    animFrameRef.current = requestAnimationFrame(processFrame)
  }, [processFrame])

  const stopProcessing = useCallback(() => {
    activeRef.current = false
    setActive(false)
    cancelAnimationFrame(animFrameRef.current)
    processingRef.current = false
    setFps(0)
  }, [])

  const openCamera = useCallback(async () => {
    stopProcessing()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      video.onloadedmetadata = () => video.play()
      setSource('camera')
    } catch {
      // permission denied or no camera
    }
  }, [stopProcessing])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopProcessing()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    const video = videoRef.current!
    video.srcObject = null
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => video.play()
    setSource('file')
  }, [stopProcessing])

  useEffect(() => {
    return () => {
      activeRef.current = false
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const currentEffect = EFFECTS[effectIndex]
  const hasSource = source !== 'none'

  return (
    <section className="demo-section">
      <h2>Video Effects — Worker</h2>

      <div className="blur-controls">
        <button onClick={openCamera}>Camera</button>
        <label className="file-label">
          Video File
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="file-hidden"
          />
        </label>
      </div>

      <div className="blur-controls">
        {EFFECTS.map((e, i) => (
          <button
            key={e.fn}
            onClick={() => setEffectIndex(i)}
            className={i === effectIndex ? 'active' : ''}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="blur-controls">
        {currentEffect.params.map((p) => {
          const key = `${currentEffect.fn}.${p.name}`
          const value = params[key] ?? p.defaultValue
          return (
            <label key={key}>
              {p.label}: {Number.isInteger(p.step) ? value : value.toFixed(1)}
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={value}
                onChange={(e) => setParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </label>
          )
        })}
        {!active ? (
          <button onClick={startProcessing} disabled={!hasSource || !loaded}>
            Start
          </button>
        ) : (
          <button onClick={stopProcessing}>Stop</button>
        )}
        {active && <span className="fps-badge">{fps} FPS</span>}
      </div>

      <div className="video-container">
        <video ref={videoRef} muted playsInline loop className="video-preview" />
        <canvas ref={canvasRef} className="video-canvas" />
      </div>
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
    </section>
  )
}
