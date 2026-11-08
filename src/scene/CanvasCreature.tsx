import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { mood } from '../mood'
import { useCompanion } from '../store/companion'
import type { EyeShape } from '../types'

/* ------------------------------------------------------------------ */
/*  绘制工具                                                           */
/* ------------------------------------------------------------------ */

type RGB = [number, number, number]

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mix = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
]

const rgba = (c: RGB, a = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`

function orbPath(
  c: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  t: number,
  amp: number,
  seed: number,
) {
  const N = 96
  c.beginPath()
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const w =
      1 +
      0.026 * Math.sin(a * 3 + t * 1.0 + seed) * amp +
      0.015 * Math.sin(a * 5 - t * 1.4 + seed * 2.3) * amp
    const x = Math.cos(a) * rx * w
    const y = Math.sin(a) * ry * w
    if (i === 0) c.moveTo(x, y)
    else c.lineTo(x, y)
  }
  c.closePath()
}

function drawOrb(
  c: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  t: number,
  amp: number,
  seed: number,
  glow: RGB,
  accent: RGB,
  gI: number,
  opts: { highlight?: number; rimAlpha?: number; refraction?: boolean } = {},
) {
  const R = Math.max(rx, ry)
  const hi = opts.highlight ?? 1
  const rimA = opts.rimAlpha ?? 1

  /* 外发光 */
  c.save()
  orbPath(c, rx, ry, t, amp, seed)
  c.fillStyle = rgba(glow, 0.045 * gI)
  c.shadowColor = rgba(glow, 0.85)
  c.shadowBlur = 60
  c.fill()
  c.restore()

  c.save()
  orbPath(c, rx, ry, t, amp, seed)
  c.clip()

  /* 膜 */
  const baseGrad = c.createRadialGradient(0, ry * 0.18, R * 0.03, 0, 0, R * 1.12)
  baseGrad.addColorStop(0, rgba(glow, 0.3))
  baseGrad.addColorStop(0.48, rgba(glow, 0.16))
  baseGrad.addColorStop(0.86, rgba(glow, 0.09))
  baseGrad.addColorStop(1, rgba(glow, 0.24))
  c.fillStyle = baseGrad
  c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3)

  /* 内部体积 */
  c.save()
  c.globalCompositeOperation = 'lighter'
  const vol = c.createRadialGradient(0, ry * 0.22, 0, 0, 0, R * 0.95)
  vol.addColorStop(0, rgba(accent, 0.24 * gI))
  vol.addColorStop(0.45, rgba(glow, 0.09 * gI))
  vol.addColorStop(1, rgba(glow, 0))
  c.fillStyle = vol
  c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3)
  c.restore()

  /* 底部压暗 */
  const shade = c.createLinearGradient(0, -R * 0.05, 0, R * 1.05)
  shade.addColorStop(0, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,.30)')
  c.fillStyle = shade
  c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3)

  /* 内缘暗边 */
  const edgeShade = c.createRadialGradient(0, 0, R * 0.72, 0, 0, R * 1.06)
  edgeShade.addColorStop(0, 'rgba(0,0,0,0)')
  edgeShade.addColorStop(1, 'rgba(0,0,0,.30)')
  c.fillStyle = edgeShade
  c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3)

  /* 柔和高光 */
  c.save()
  c.globalCompositeOperation = 'lighter'
  const hs = Math.PI * 1.08
  const he = Math.PI * 1.52
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const p = i / steps
    const a = hs + (he - hs) * p
    const hx = Math.cos(a) * rx * 0.78
    const hy = Math.sin(a) * ry * 0.78
    const env = Math.sin(p * Math.PI)
    const rr = R * 0.06
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, rr)
    g.addColorStop(0, 'rgba(255,255,255,' + (0.15 * env * hi).toFixed(3) + ')')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.beginPath()
    c.arc(hx, hy, rr, 0, Math.PI * 2)
    c.fill()
  }
  c.restore()

  c.restore()

  /* 底部折射 */
  if (opts.refraction !== false) {
    c.save()
    c.globalCompositeOperation = 'lighter'
    c.beginPath()
    c.ellipse(0, 0, rx * 0.93, ry * 0.93, 0, Math.PI * 0.22, Math.PI * 0.78)
    c.strokeStyle = rgba(accent, 0.085)
    c.lineWidth = R * 0.028
    c.shadowColor = rgba(glow, 0.9)
    c.shadowBlur = 18
    c.stroke()
    c.restore()
  }

  /* 边缘光 */
  orbPath(c, rx, ry, t, amp, seed)
  c.save()
  const rimGrad = c.createLinearGradient(-rx * 0.8, -ry * 0.9, rx * 0.7, ry * 0.8)
  rimGrad.addColorStop(0, rgba(accent, 0.8 * rimA))
  rimGrad.addColorStop(0.45, rgba(accent, 0.42 * rimA))
  rimGrad.addColorStop(1, rgba(accent, 0.1 * rimA))
  c.strokeStyle = rimGrad
  c.lineWidth = 1.3
  c.shadowColor = rgba(glow, 0.9)
  c.shadowBlur = 20
  c.stroke()
  c.restore()
}

function drawArmBall(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  glow: RGB,
  accent: RGB,
  gI: number,
) {
  c.save()
  c.globalCompositeOperation = 'lighter'

  const og = c.createRadialGradient(x, y, 0, x, y, r * 2.7)
  og.addColorStop(0, rgba(glow, 0.22 * gI))
  og.addColorStop(0.5, rgba(glow, 0.055 * gI))
  og.addColorStop(1, rgba(glow, 0))
  c.fillStyle = og
  c.beginPath()
  c.arc(x, y, r * 2.7, 0, Math.PI * 2)
  c.fill()

  const bg = c.createRadialGradient(x - r * 0.34, y - r * 0.38, r * 0.05, x, y, r * 1.04)
  bg.addColorStop(0, rgba(mix(glow, [255, 255, 255], 0.48), 0.58))
  bg.addColorStop(0.45, rgba(glow, 0.34))
  bg.addColorStop(1, rgba(glow, 0.12))
  c.fillStyle = bg
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()

  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.strokeStyle = rgba(accent, 0.55)
  c.lineWidth = 1.1
  c.shadowColor = rgba(glow, 0.9)
  c.shadowBlur = 14
  c.stroke()
  c.shadowBlur = 0

  c.fillStyle = 'rgba(255,255,255,.28)'
  c.beginPath()
  c.ellipse(x - r * 0.32, y - r * 0.36, r * 0.18, r * 0.12, -0.5, 0, Math.PI * 2)
  c.fill()

  c.restore()
}

function drawStar(c: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
  c.save()
  c.translate(x, y)
  c.globalAlpha = alpha
  c.fillStyle = '#ffffff'
  c.beginPath()
  c.moveTo(0, -r)
  c.quadraticCurveTo(0, 0, r, 0)
  c.quadraticCurveTo(0, 0, 0, r)
  c.quadraticCurveTo(0, 0, -r, 0)
  c.quadraticCurveTo(0, 0, 0, -r)
  c.fill()
  c.restore()
}

function drawEye(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  shape: EyeShape,
  openness: number,
  side: -1 | 1,
) {
  c.save()
  c.translate(x, y)
  const ink = 'rgba(8, 10, 20, .88)'

  if (shape === 'happy') {
    c.strokeStyle = ink
    c.lineWidth = r * 0.5
    c.lineCap = 'round'
    c.beginPath()
    c.arc(0, r * 0.16, r * 0.94, Math.PI * 1.14, Math.PI * 1.86)
    c.stroke()
  } else if (shape === 'shy') {
    const m = side === -1 ? 1 : -1
    c.strokeStyle = ink
    c.lineWidth = r * 0.44
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(-0.56 * r * m, -0.62 * r)
    c.lineTo(0.44 * r * m, 0)
    c.lineTo(-0.56 * r * m, 0.62 * r)
    c.stroke()
  } else if (shape === 'sleepy') {
    c.strokeStyle = ink
    c.lineWidth = r * 0.42
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-0.72 * r, -0.05 * r)
    c.quadraticCurveTo(0, 0.34 * r, 0.72 * r, -0.05 * r)
    c.stroke()
  } else if (shape === 'sad') {
    const ry = r * 0.72
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, r * 0.05, r, ry, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.55)'
    c.beginPath()
    c.ellipse(-r * 0.28, -ry * 0.12, r * 0.22, ry * 0.2, -0.4, 0, Math.PI * 2)
    c.fill()
  } else if (shape === 'angry') {
    const ry = r * 0.4
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, r * 0.1, r, ry, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.55)'
    c.beginPath()
    c.ellipse(-r * 0.28, r * 0.02, r * 0.2, ry * 0.3, -0.3, 0, Math.PI * 2)
    c.fill()

    const m = side === -1 ? 1 : -1
    c.strokeStyle = 'rgba(8,10,20,.78)'
    c.lineWidth = r * 0.28
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-r * 0.88 * m, -r * 0.98)
    c.lineTo(r * 0.78 * m, -r * 0.52)
    c.stroke()
  } else if (shape === 'surprised') {
    const rx = r * 1.08
    const ry = r * 1.16
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.86)'
    c.beginPath()
    c.ellipse(-rx * 0.28, -ry * 0.32, rx * 0.24, ry * 0.2, -0.4, 0, Math.PI * 2)
    c.fill()
  } else if (shape === 'thinking') {
    const ry = r * 0.92
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, -r * 0.1, r, ry, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.78)'
    c.beginPath()
    c.ellipse(-r * 0.28, -r * 0.46, r * 0.24, ry * 0.19, -0.4, 0, Math.PI * 2)
    c.fill()
  } else if (shape === 'bored') {
    const ry = r * 0.42
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, r * 0.12, r, ry, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.45)'
    c.beginPath()
    c.ellipse(-r * 0.3, r * 0.02, r * 0.2, ry * 0.3, -0.3, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = ink
    c.lineWidth = r * 0.22
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-r * 0.95, -r * 0.12)
    c.lineTo(r * 0.95, -r * 0.12)
    c.stroke()
  } else if (shape === 'clingy') {
    const ry = r * 1.02
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.9)'
    c.beginPath()
    c.ellipse(-r * 0.3, -ry * 0.36, r * 0.3, ry * 0.24, -0.4, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,.55)'
    c.beginPath()
    c.ellipse(r * 0.24, ry * 0.3, r * 0.14, ry * 0.11, -0.4, 0, Math.PI * 2)
    c.fill()
  } else {
    const ry = Math.max(r * 0.09, r * 0.96 * openness)
    c.fillStyle = ink
    c.beginPath()
    c.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
    c.fill()

    c.fillStyle = 'rgba(255, 255, 255, .82)'
    c.beginPath()
    c.ellipse(-r * 0.3, -ry * 0.34, r * 0.26, ry * 0.22, -0.4, 0, Math.PI * 2)
    c.fill()
  }

  c.restore()
}

/* 粒子 / 光斑（模块级，避免每帧重建） */
const dust = Array.from({ length: 40 }, () => ({
  seed: Math.random(),
  orbit: 0.55 + Math.random() * 1.05,
  angle: Math.random() * Math.PI * 2,
  speed: 0.06 + Math.random() * 0.16,
  size: 0.7 + Math.random() * 1.7,
  drift: 0.25 + Math.random() * 0.75,
}))

const glowRGB = { r: 0, g: 0, b: 0 }
const accentRGB = { r: 0, g: 0, b: 0 }

/* ------------------------------------------------------------------ */
/*  渲染一帧                                                           */
/* ------------------------------------------------------------------ */

function render(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  motion: number,
) {
  const s = mood.current
  const light = useCompanion.getState().light

  mood.glow.getRGB(glowRGB, THREE.SRGBColorSpace)
  mood.accent.getRGB(accentRGB, THREE.SRGBColorSpace)
  const glow: RGB = [glowRGB.r * 255, glowRGB.g * 255, glowRGB.b * 255]
  const accent: RGB = [accentRGB.r * 255, accentRGB.g * 255, accentRGB.b * 255]

  const gI = s.glow * light

  ctx.clearRect(0, 0, W, H)

  const base = Math.min(W * 0.38, H * 0.32, 210)
  const Rh = base * s.size

  const breath = Math.sin(t * Math.PI * 2 * s.breathRate) * 0.028 * s.breathAmp * motion
  const hop = Math.abs(Math.sin(t * 2.4)) * 16 * s.bounce * motion

  const cx = W / 2
  const cyBase = H * 0.395
  const cy = cyBase - hop
  const bodyCy = cy + Rh * 1.06
  const bodyRx = Rh * 0.52
  const bodyRy = Rh * 0.4
  const floorY = cyBase + Rh * 1.5

  const sx = 1 + breath + s.squash * 0.1
  const sy = 1 - breath - s.squash * 0.1

  const wobble = s.breathAmp * motion

  /* 身体（裁掉与头部重叠的部分，形成连贯剪影） */
  ctx.save()
  ctx.translate(cx, bodyCy)
  ctx.scale(1 + breath * 0.5, 1 - breath * 0.5)
  const bodyClip = new Path2D()
  bodyClip.rect(-9999, -9999, 19998, 19998)
  bodyClip.arc(0, cy - bodyCy, Rh, 0, Math.PI * 2)
  ctx.clip(bodyClip, 'evenodd')
  drawOrb(ctx, bodyRx, bodyRy, t, wobble * 0.8, 2.7, glow, accent, gI, {
    highlight: 0.7,
    rimAlpha: 0.55,
  })
  ctx.restore()

  /* 小短手 · 会晃的光球 */
  const ballR = Rh * 0.12
  const armDist = bodyRx * 0.88 + ballR * 0.7
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 1.7 + side * 1.25) * 0.055 * motion
    const hang = s.arm + sway + Math.sin(t * 4.2) * 0.05 * s.bounce
    const bx = cx + side * Math.cos(hang) * armDist
    const by =
      bodyCy +
      Math.sin(hang) * armDist +
      Math.sin(t * 2.4 - 0.9 + side * 0.18) * 7 * s.bounce * motion
    drawArmBall(ctx, bx, by, ballR, glow, accent, gI)
  }

  /* 头 */
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(sx, sy)

  drawOrb(ctx, Rh, Rh * 1.02, t, wobble, 0, glow, accent, gI, { refraction: false })

  const lookX = clamp(mood.pointer.x * Rh * 0.05, -Rh * 0.05, Rh * 0.05)
  const lookY = clamp(mood.pointer.y * Rh * 0.04, -Rh * 0.04, Rh * 0.04)
  const eyeR = Rh * 0.125
  const eyeX = Rh * 0.31
  const eyeY = -Rh * 0.03 + lookY

  drawEye(ctx, -eyeX + lookX, eyeY, eyeR, mood.eye, s.eyeOpen, -1)
  drawEye(ctx, eyeX + lookX, eyeY, eyeR, mood.eye, s.eyeOpen, 1)

  if (s.blush > 0.02) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const side of [-1, 1]) {
      const bx = side * Rh * 0.47
      const by = Rh * 0.28
      const b = ctx.createRadialGradient(bx, by, 0, bx, by, Rh * 0.24)
      b.addColorStop(0, rgba(accent, 0.13 * s.blush))
      b.addColorStop(1, rgba(accent, 0))
      ctx.fillStyle = b
      ctx.beginPath()
      ctx.ellipse(bx, by, Rh * 0.24, Rh * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /* 委屈的泪滴 */
  if (mood.key === 'sad') {
    const tp = (t * 0.34) % 1
    const tx = -Rh * 0.31
    const ty = Rh * 0.05 + tp * Rh * 0.24
    ctx.save()
    ctx.globalAlpha = Math.sin(tp * Math.PI) * 0.8
    ctx.fillStyle = rgba(accent, 0.85)
    ctx.beginPath()
    ctx.moveTo(tx, ty - Rh * 0.042)
    ctx.quadraticCurveTo(tx + Rh * 0.026, ty + Rh * 0.008, tx, ty + Rh * 0.024)
    ctx.quadraticCurveTo(tx - Rh * 0.026, ty + Rh * 0.008, tx, ty - Rh * 0.042)
    ctx.fill()
    ctx.restore()
  }

  /* 嘴 */
  if (mood.eye !== 'sleepy') {
    const shape = mood.eye
    ctx.save()
    ctx.strokeStyle = 'rgba(8, 10, 20, .48)'
    ctx.lineWidth = Math.max(1.8, Rh * 0.02)
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (shape === 'happy' || shape === 'clingy') {
      ctx.arc(0, Rh * 0.21, Rh * 0.14, 0.16 * Math.PI, 0.84 * Math.PI)
    } else if (shape === 'shy') {
      ctx.arc(0, Rh * 0.27, Rh * 0.04, 0, Math.PI * 2)
    } else if (shape === 'surprised') {
      ctx.arc(0, Rh * 0.28, Rh * 0.072, 0, Math.PI * 2)
    } else if (shape === 'sad' || shape === 'angry') {
      ctx.arc(0, Rh * 0.36, Rh * 0.1, 1.15 * Math.PI, 1.85 * Math.PI)
    } else if (shape === 'bored') {
      ctx.moveTo(-Rh * 0.065, Rh * 0.3)
      ctx.lineTo(Rh * 0.065, Rh * 0.3)
    } else if (shape === 'thinking') {
      ctx.moveTo(-Rh * 0.06, Rh * 0.29)
      ctx.quadraticCurveTo(-Rh * 0.02, Rh * 0.26, Rh * 0.02, Rh * 0.29)
      ctx.quadraticCurveTo(Rh * 0.05, Rh * 0.32, Rh * 0.078, Rh * 0.29)
    } else {
      ctx.moveTo(-Rh * 0.075, Rh * 0.26)
      ctx.quadraticCurveTo(0, Rh * 0.31, Rh * 0.075, Rh * 0.26)
    }
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()

  /* 近景光尘 */
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const driftRange = Rh * 4.2
  for (const p of dust) {
    const a = p.angle + t * p.speed * motion * 0.5
    const px = cx + Math.cos(a) * Rh * p.orbit * 1.7
    const raw = t * p.drift * (6 + s.rise * 22) * motion + p.seed * 1000
    const drift = ((raw % 1000) + 1000) % 1000
    const py = cy + Rh * 1.9 - (drift / 1000) * driftRange
    const alpha = (0.08 + 0.2 * p.seed) * (0.45 + gI)
    ctx.fillStyle = rgba(glow, alpha)
    ctx.beginPath()
    ctx.arc(px, py, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  /* 情绪特效 */
  if (mood.key === 'sleepy') {
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.32 + i / 3) % 1
      const zx = cx + Rh * 0.52 + p * Rh * 0.44
      const zy = cy - Rh * 0.82 - p * Rh * 0.64
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.55
      ctx.fillStyle = rgba(accent, 1)
      ctx.font =
        '600 ' + Math.round(Rh * 0.1 + p * Rh * 0.07) + 'px "JetBrains Mono", monospace'
      ctx.fillText('z', zx, zy)
    }
    ctx.restore()
  }

  if (mood.key === 'happy' || mood.key === 'curious') {
    const amount = mood.key === 'happy' ? 5 : 3
    for (let i = 0; i < amount; i++) {
      const a = t * 0.5 + (i / amount) * Math.PI * 2
      const r = Rh * (1.2 + 0.12 * Math.sin(t * 1.7 + i))
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r * 0.72
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + i * 1.7))
      drawStar(ctx, x, y, Rh * 0.028 * (0.7 + tw * 0.6), tw * 0.55 * gI)
    }
  }

  if (mood.key === 'thinking') {
    for (let i = 0; i < 3; i++) {
      const a = 0.22 + 0.6 * Math.max(0, Math.sin(t * 2.2 - i * 0.7))
      ctx.fillStyle = rgba(accent, a)
      ctx.beginPath()
      ctx.arc(cx + Rh * 0.7 + i * Rh * 0.1, cy - Rh * 0.78, Rh * 0.023, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (mood.key === 'clingy') {
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.3 + i / 3) % 1
      const hx = cx + (i - 1) * Rh * 0.4 + Math.sin(t * 1.2 + i) * Rh * 0.05
      const hy = cy - Rh * 0.55 - p * Rh * 0.85
      const sz = Rh * 0.03
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.75
      ctx.fillStyle = rgba(accent, 1)
      ctx.beginPath()
      ctx.moveTo(hx, hy + sz * 0.8)
      ctx.bezierCurveTo(
        hx - sz * 1.4, hy - sz * 0.2,
        hx - sz * 0.6, hy - sz * 1.4,
        hx, hy - sz * 0.5,
      )
      ctx.bezierCurveTo(
        hx + sz * 0.6, hy - sz * 1.4,
        hx + sz * 1.4, hy - sz * 0.2,
        hx, hy + sz * 0.8,
      )
      ctx.fill()
    }
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ */
/*  组件                                                               */
/* ------------------------------------------------------------------ */

export function CanvasCreature() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1
    const started = performance.now()
    let raf = 0

    const loop = (now: number) => {
      render(ctx, W, H, (now - started) / 1000, motion)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
