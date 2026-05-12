import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

// ── Ribbon configuration ────────────────────────────────────────────────────
// Each ribbon is a set of parallel flowing lines. The centre line is the
// brightest; lines fan out and fade toward transparent edges.
const RIBBON_PTS   = 220  // Points along each line
const LINES_ORANGE = 10
const LINES_BLUE   = 10
const LINE_SPREAD  = 0.22 // vertical gap between adjacent lines in ribbon

// ── Logo sprites ────────────────────────────────────────────────────────────
const LOGO_CONFIGS = [
  { src: '/logos/claude.png',  baseX: -5.8, baseY:  1.4, z: -0.5, scale: 2.0, phase: 0 },
  { src: '/logos/gemini.webp', baseX:  0.4, baseY: -2.0, z:  0.8, scale: 2.4, phase: (Math.PI * 2) / 3 },
  { src: '/logos/codex.webp',  baseX:  5.6, baseY:  1.0, z: -1.5, scale: 1.8, phase: (Math.PI * 4) / 3 },
]
type LogoSprite = THREE.Sprite & { _baseX: number; _baseY: number; _phase: number }

// ── Helpers ──────────────────────────────────────────────────────────────────
function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

// Wave function for a ribbon centre line
function waveY(x: number, t: number, amp: number, freq: number, speed: number, phase: number) {
  return (
    amp       * Math.sin(x * freq        + t * speed       + phase) +
    amp * 0.4 * Math.cos(x * freq * 1.7  + t * speed * 0.6 + phase + 1.1)
  )
}

// Opacity falloff from ribbon centre: exponential so edge lines nearly vanish
function ribbonOpacity(lineIdx: number, totalLines: number): number {
  const centre = (totalLines - 1) / 2
  const dist   = Math.abs(lineIdx - centre) / centre // 0 = centre, 1 = edge
  return Math.max(0.04, Math.exp(-dist * 3.2))
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

      // Strip white / near-white background pixels
      const id   = ctx.getImageData(0, 0, sz, sz)
      const data = id.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        if (r > 220 && g > 220 && b > 220) {
          data[i + 3] = 0
        }
      }
      ctx.putImageData(id, 0, 0)
      resolve(new THREE.CanvasTexture(c))
    }
    img.onerror = () => resolve(new THREE.Texture())
    img.src = src
  })
}

// Build one line (THREE.Line) for a ribbon
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
    color,
    transparent: true,
    opacity,
    blending:  THREE.AdditiveBlending,
    depthWrite: false,
  })
  return { line: new THREE.Line(geo, mat), mat, posAttr }
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  focusRef: MutableRefObject<number | null>
}

export default function AnimatedBackground({ focusRef }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const scrollRef  = useRef(0)
  const camZRef    = useRef(9)
  const camYRef    = useRef(0)
  const camXRef    = useRef(0)

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

    // ── Orange ribbon (left-biased) ──────────────────────────────────────────
    const orangeCore  = new THREE.Color('#ff7030')
    const orangeEdge  = new THREE.Color('#f79820')

    const orangeLines: Array<{ mat: THREE.LineBasicMaterial; posAttr: THREE.BufferAttribute; yOffset: number; baseOpacity: number }> = []
    for (let i = 0; i < LINES_ORANGE; i++) {
      const t       = i / (LINES_ORANGE - 1)
      const colour  = orangeCore.clone().lerp(orangeEdge, t)
      const opacity = ribbonOpacity(i, LINES_ORANGE)
      const centre  = (LINES_ORANGE - 1) / 2
      const yOff    = (i - centre) * LINE_SPREAD
      const { line, mat, posAttr } = makeRibbonLine(colour, opacity)
      scene.add(line)
      orangeLines.push({ mat, posAttr, yOffset: yOff, baseOpacity: opacity })
    }

    // ── Blue ribbon (right-biased) ───────────────────────────────────────────
    const blueCore = new THREE.Color('#4361ee')
    const blueEdge = new THREE.Color('#7b2ff7')

    const blueLines: Array<{ mat: THREE.LineBasicMaterial; posAttr: THREE.BufferAttribute; yOffset: number; baseOpacity: number }> = []
    for (let i = 0; i < LINES_BLUE; i++) {
      const t       = i / (LINES_BLUE - 1)
      const colour  = blueCore.clone().lerp(blueEdge, t)
      const opacity = ribbonOpacity(i, LINES_BLUE)
      const centre  = (LINES_BLUE - 1) / 2
      const yOff    = (i - centre) * LINE_SPREAD
      const { line, mat, posAttr } = makeRibbonLine(colour, opacity)
      scene.add(line)
      blueLines.push({ mat, posAttr, yOffset: yOff, baseOpacity: opacity })
    }

    // ── Sparse background dots ───────────────────────────────────────────────
    const DOT_COUNT  = 160
    const dotPos     = new Float32Array(DOT_COUNT * 3)
    const dotCol     = new Float32Array(DOT_COUNT * 3)
    for (let i = 0; i < DOT_COUNT; i++) {
      dotPos[i * 3]     = (Math.random() - 0.5) * 30
      dotPos[i * 3 + 1] = (Math.random() - 0.5) * 16
      dotPos[i * 3 + 2] = (Math.random() - 0.5) * 8
      // Mostly white, few tinted
      const tint = Math.random()
      if (tint < 0.3) {
        dotCol[i * 3] = 1; dotCol[i * 3 + 1] = 0.45; dotCol[i * 3 + 2] = 0.2 // orange
      } else if (tint < 0.6) {
        dotCol[i * 3] = 0.3; dotCol[i * 3 + 1] = 0.4; dotCol[i * 3 + 2] = 1  // blue
      } else {
        dotCol[i * 3] = 1; dotCol[i * 3 + 1] = 1; dotCol[i * 3 + 2] = 1       // white
      }
    }
    const dotGeo = new THREE.BufferGeometry()
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    dotGeo.setAttribute('color',    new THREE.BufferAttribute(dotCol, 3))
    const dotMat = new THREE.PointsMaterial({
      size: 0.055, vertexColors: true, transparent: true, opacity: 0.5,
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
          blending: THREE.NormalBlending, depthWrite: false,
          alphaTest: 0.01,
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

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ───────────────────────────────────────────────────────
    let animId: number

    const animate = (ts: number) => {
      animId = requestAnimationFrame(animate)
      const t = reduceMotion ? 0 : ts * 0.001
      const scrollProgress = clamp01(scrollRef.current / 520)
      const focusedIdx = focusRef.current
      const backgroundFocus = lerp(1, 0.32, scrollProgress)
      const logoFocus = lerp(0.22, 0.07, scrollProgress)
      const dotFocus = lerp(0.5, 0.22, scrollProgress)

      // Orange ribbon: biased left, sweeps from lower-left to upper-right
      const oAmp   = 1.7
      const oFreq  = 0.14
      const oSpeed = 0.28
      const oPhase = 0.0
      const oBaseY = -0.3  // Slightly below centre

      orangeLines.forEach(({ mat, posAttr, yOffset, baseOpacity }) => {
        mat.opacity = baseOpacity * backgroundFocus
        for (let p = 0; p < RIBBON_PTS; p++) {
          const x = (p / (RIBBON_PTS - 1) - 0.5) * 22 - 1.5 + scrollProgress * 0.9
          const y = waveY(x, t, oAmp, oFreq, oSpeed, oPhase) + oBaseY + yOffset - scrollProgress * 0.7
          const z = Math.sin(x * 0.08 + t * 0.1) * 1.2
          posAttr.setXYZ(p, x, y, z)
        }
        posAttr.needsUpdate = true
      })

      // Blue ribbon: biased right, sweeps from upper-left to lower-right — crosses orange
      const bAmp   = 1.9
      const bFreq  = 0.12
      const bSpeed = 0.22
      const bPhase = Math.PI * 0.6
      const bBaseY = 0.4  // Slightly above centre

      blueLines.forEach(({ mat, posAttr, yOffset, baseOpacity }) => {
        mat.opacity = baseOpacity * backgroundFocus
        for (let p = 0; p < RIBBON_PTS; p++) {
          const x = (p / (RIBBON_PTS - 1) - 0.5) * 22 + 1.5 - scrollProgress * 0.9
          const y = waveY(x, t, bAmp, bFreq, bSpeed, bPhase) + bBaseY + yOffset - scrollProgress * 0.55
          const z = Math.cos(x * 0.1 + t * 0.08) * 1.0
          posAttr.setXYZ(p, x, y, z)
        }
        posAttr.needsUpdate = true
      })

      dotMat.opacity = dotFocus

      // ── Scroll-driven parallax ────────────────────────────────────────────
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

      // Subtle scene rotation for 3D depth
      scene.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.05) * 0.045

      // Logos drift in slow Lissajous paths; brighten focused logo
      sprites.forEach((sp, i) => {
        let targetOpacity: number
        if (focusedIdx === null) {
          targetOpacity = logoFocus
        } else if (i === focusedIdx) {
          targetOpacity = 0.55
        } else {
          targetOpacity = 0.04
        }
        sp.material.opacity += (targetOpacity - sp.material.opacity) * 0.05
        sp.position.x = sp._baseX + Math.sin(t * 0.16 + sp._phase) * 0.7
        sp.position.y = sp._baseY + Math.cos(t * 0.11 + sp._phase) * 0.45 - scrollProgress * 0.5
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
