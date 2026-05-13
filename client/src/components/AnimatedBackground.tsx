import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

const RIBBON_PTS       = 220
const LINES_PER_RIBBON = 7
const LINE_SPREAD      = 0.26

// Brand colors: Anthropic · Google · OpenAI
const C_ORANGE = new THREE.Color('#ff6b35')
const C_BLUE   = new THREE.Color('#4361ee')
const C_GREEN  = new THREE.Color('#10b981')

// focusedIdx → gradient t position (0=orange, 0.5=blue, 1=green)
const FOCUS_T = [0, 0.5, 1]

function threeStopColor(t: number, a: THREE.Color, b: THREE.Color, c: THREE.Color): THREE.Color {
  if (t < 0.5) return a.clone().lerp(b, t * 2)
  return b.clone().lerp(c, (t - 0.5) * 2)
}

const RIBBON_CONFIGS = [
  { xBias: -1.5, xDir:  1, baseY: -0.3, amp: 1.7, freq: 0.14, speed: 0.28, phase: 0.0 },
  { xBias:  1.5, xDir: -1, baseY:  0.4, amp: 1.9, freq: 0.12, speed: 0.22, phase: Math.PI * 0.6 },
]

const LOGO_CONFIGS = [
  { src: '/logos/claude.png',  baseX: -5.8, baseY:  1.4, z: -0.5, scale: 2.0, phase: 0 },
  { src: '/logos/gemini.webp', baseX:  0.4, baseY: -2.0, z:  0.8, scale: 2.4, phase: (Math.PI * 2) / 3 },
  { src: '/logos/codex.webp',  baseX:  5.6, baseY:  1.0, z: -1.5, scale: 1.8, phase: (Math.PI * 4) / 3 },
]

const MOBILE_LOGO_CONFIGS = [
  { baseX: -1.7, baseY:  2.4, scale: 1.15 },
  { baseX:  1.45, baseY: 0.55, scale: 1.22 },
  { baseX: -0.9, baseY: -2.05, scale: 1.05 },
]

type LogoSprite = THREE.Sprite & { _baseX: number; _baseY: number; _phase: number }

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function waveY(x: number, t: number, amp: number, freq: number, speed: number, phase: number) {
  return (
    amp       * Math.sin(x * freq        + t * speed       + phase) +
    amp * 0.4 * Math.cos(x * freq * 1.7  + t * speed * 0.6 + phase + 1.1)
  )
}

function ribbonOpacity(lineIdx: number, totalLines: number): number {
  const centre = (totalLines - 1) / 2
  const dist   = Math.abs(lineIdx - centre) / centre
  return 0.72 - dist * 0.38  // 0.72 at centre, 0.34 at edge — flat enough for all 3 color zones to pop
}

function loadImageAsTexture(src: string): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const sz  = 256
      const c   = document.createElement('canvas')
      c.width = c.height = sz
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, sz, sz)
      const id   = ctx.getImageData(0, 0, sz, sz)
      const data = id.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        if (r > 220 && g > 220 && b > 220) data[i + 3] = 0
      }
      ctx.putImageData(id, 0, 0)
      resolve(new THREE.CanvasTexture(c))
    }
    img.onerror = () => resolve(new THREE.Texture())
    img.src = src
  })
}

function makeRibbonLine(color: THREE.Color, opacity: number): {
  line: THREE.Line
  mat: THREE.LineBasicMaterial
  posAttr: THREE.BufferAttribute
} {
  const pos = new Float32Array(RIBBON_PTS * 3)
  const geo = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(pos, 3)
  geo.setAttribute('position', posAttr)
  const mat = new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  return { line: new THREE.Line(geo, mat), mat, posAttr }
}

interface Props {
  focusRef: MutableRefObject<number | null>
}

export default function AnimatedBackground({ focusRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)
  const camZRef   = useRef(9)
  const camYRef   = useRef(0)
  const camXRef   = useRef(0)

  useEffect(() => {
    const onScroll = () => { scrollRef.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 9)
    const isMobileRef = { current: window.innerWidth < 640 }

    // ── Two ribbons, each a 3-stop gradient ──────────────────────────────────
    // gradientT tracks each line's position (0=orange, 0.5=blue, 1=green)
    // so hover focus can selectively brighten/dim by color zone
    type RibbonLine = {
      mat: THREE.LineBasicMaterial
      posAttr: THREE.BufferAttribute
      yOffset: number
      baseOpacity: number
      gradientT: number
    }
    const ribbons: RibbonLine[][] = RIBBON_CONFIGS.map((_, ri) => {
      const lines: RibbonLine[] = []
      for (let i = 0; i < LINES_PER_RIBBON; i++) {
        const gradientT = i / (LINES_PER_RIBBON - 1)
        const colour = ri === 0
          ? threeStopColor(gradientT, C_ORANGE, C_BLUE, C_GREEN)
          : threeStopColor(gradientT, C_GREEN,  C_BLUE, C_ORANGE)
        const opacity = ribbonOpacity(i, LINES_PER_RIBBON)
        const centre  = (LINES_PER_RIBBON - 1) / 2
        const yOff    = (i - centre) * LINE_SPREAD
        const { line, mat, posAttr } = makeRibbonLine(colour, opacity)
        scene.add(line)
        lines.push({ mat, posAttr, yOffset: yOff, baseOpacity: opacity, gradientT })
      }
      return lines
    })

    // ── Background dots ───────────────────────────────────────────────────────
    const DOT_COUNT = 160
    const dotPos    = new Float32Array(DOT_COUNT * 3)
    const dotCol    = new Float32Array(DOT_COUNT * 3)
    const dotColors = [
      [1.0, 0.42, 0.21],
      [0.26, 0.38, 0.93],
      [0.06, 0.73, 0.51],
      [1.0, 1.0,  1.0],
    ]
    for (let i = 0; i < DOT_COUNT; i++) {
      dotPos[i * 3]     = (Math.random() - 0.5) * 30
      dotPos[i * 3 + 1] = (Math.random() - 0.5) * 16
      dotPos[i * 3 + 2] = (Math.random() - 0.5) * 8
      const c = dotColors[Math.floor(Math.random() * 4)]
      dotCol[i * 3] = c[0]; dotCol[i * 3 + 1] = c[1]; dotCol[i * 3 + 2] = c[2]
    }
    const dotGeo = new THREE.BufferGeometry()
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    dotGeo.setAttribute('color',    new THREE.BufferAttribute(dotCol, 3))
    const dotMat = new THREE.PointsMaterial({
      size: 0.055, vertexColors: true, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    scene.add(new THREE.Points(dotGeo, dotMat))

    // ── Logo sprites ─────────────────────────────────────────────────────────
    const sprites: LogoSprite[] = []
    Promise.all(LOGO_CONFIGS.map((c) => loadImageAsTexture(c.src))).then((textures) => {
      textures.forEach((tex, i) => {
        const cfg = LOGO_CONFIGS[i]
        const mat = new THREE.SpriteMaterial({
          map: tex, transparent: true, opacity: 0.22,
          blending: THREE.NormalBlending, depthWrite: false, alphaTest: 0.01,
        })
        const sp  = new THREE.Sprite(mat) as LogoSprite
        sp.position.set(cfg.baseX, cfg.baseY, cfg.z)
        sp.scale.set(cfg.scale, cfg.scale, 1)
        sp._baseX = cfg.baseX
        sp._baseY = cfg.baseY
        sp._phase = cfg.phase
        scene.add(sp)
        sprites.push(sp)
      })
    })

    const onResize = () => {
      isMobileRef.current = window.innerWidth < 640
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    let animId: number

    const animate = (ts: number) => {
      animId = requestAnimationFrame(animate)
      const t = reduceMotion ? 0 : ts * 0.001
      const scrollProgress  = clamp01(scrollRef.current / 520)
      const focusedIdx      = isMobileRef.current ? null : focusRef.current
      const backgroundFocus = lerp(0.6, 0.2, scrollProgress)
      const logoFocus       = isMobileRef.current ? lerp(0.11, 0.05, scrollProgress) : lerp(0.22, 0.07, scrollProgress)
      const dotFocus        = lerp(0.6, 0.25, scrollProgress)

      ribbons.forEach((lines, ri) => {
        const cfg = RIBBON_CONFIGS[ri]
        lines.forEach(({ mat, posAttr, yOffset, baseOpacity, gradientT }) => {
          let opacityScale: number

          if (focusedIdx === null) {
            opacityScale = backgroundFocus
          } else {
            const targetT  = FOCUS_T[focusedIdx]
            // ribbon 1 is reversed, so mirror the target t
            const lineT    = ri === 0 ? gradientT : 1 - gradientT
            const dist     = Math.abs(lineT - targetT)
            const inZone   = clamp01(1 - dist / 0.35)
            opacityScale = lerp(0.1, 2.8, inZone) * lerp(1, 0.4, scrollProgress)
          }

          mat.opacity = clamp01(baseOpacity * opacityScale)

          for (let p = 0; p < RIBBON_PTS; p++) {
            const x = (p / (RIBBON_PTS - 1) - 0.5) * 22 + cfg.xBias + cfg.xDir * scrollProgress * 0.9
            const y = waveY(x, t, cfg.amp, cfg.freq, cfg.speed, cfg.phase) + cfg.baseY + yOffset - scrollProgress * 0.6
            const z = Math.sin(x * 0.09 + t * 0.09 + ri * 1.2) * 1.1
            posAttr.setXYZ(p, x, y, z)
          }
          posAttr.needsUpdate = true
        })
      })

      dotMat.opacity = dotFocus

      const scrollTargetZ = reduceMotion ? 9 : 9 - scrollProgress * 1.4
      const scrollTargetY = reduceMotion ? 0 : scrollProgress * 0.25
      const focused = focusedIdx !== null ? LOGO_CONFIGS[focusedIdx] : null
      const targetZ = focused ? 6.0 : scrollTargetZ
      const targetY = focused ? focused.baseY * 0.3 + scrollTargetY : scrollTargetY
      const targetX = focused ? focused.baseX * 0.35 : 0

      camZRef.current += (targetZ - camZRef.current) * 0.018
      camYRef.current += (targetY - camYRef.current) * 0.018
      camXRef.current += (targetX - camXRef.current) * 0.018
      camera.position.z = camZRef.current
      camera.position.y = camYRef.current
      camera.position.x = camXRef.current
      camera.rotation.x = -scrollProgress * 0.025

      scene.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.05) * 0.045

      sprites.forEach((sp, i) => {
        let targetOpacity: number
        if (isMobileRef.current) {
          targetOpacity = logoFocus
        } else if (focusedIdx === null) {
          targetOpacity = logoFocus
        } else if (i === focusedIdx) {
          targetOpacity = 0.55
        } else {
          targetOpacity = 0.04
        }
        const mobileCfg = MOBILE_LOGO_CONFIGS[i]
        const baseX = isMobileRef.current ? mobileCfg.baseX : sp._baseX
        const baseY = isMobileRef.current ? mobileCfg.baseY : sp._baseY
        const targetScale = isMobileRef.current ? mobileCfg.scale : LOGO_CONFIGS[i].scale
        sp.material.opacity += (targetOpacity - sp.material.opacity) * 0.05
        sp.position.x = baseX + Math.sin(t * 0.16 + sp._phase) * (isMobileRef.current ? 0.22 : 0.7)
        sp.position.y = baseY + Math.cos(t * 0.11 + sp._phase) * (isMobileRef.current ? 0.18 : 0.45) - scrollProgress * 0.5
        sp.scale.x += (targetScale - sp.scale.x) * 0.05
        sp.scale.y += (targetScale - sp.scale.y) * 0.05
      })

      renderer.render(scene, camera)
    }

    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
