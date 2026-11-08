import { Color } from 'three'
import { EMOTIONS } from './data/emotions'
import type { EmotionKey, EyeShape, MoodParams } from './types'

const IDLE = EMOTIONS.idle

const PARAM_KEYS = Object.keys(IDLE.params) as (keyof MoodParams)[]

/**
 * 全局可变情绪状态。
 *
 * 3D 场景以 60fps 读取它，所以刻意不放在 React state 里 —— 避免每帧触发重渲染。
 * 只有「目标情绪」变化时才需要通知 React（由 zustand 负责）。
 */
export const mood = {
  key: 'idle' as EmotionKey,
  eye: 'open' as EyeShape,
  current: { ...IDLE.params } as MoodParams,
  target: { ...IDLE.params } as MoodParams,
  glow: new Color(IDLE.theme.glow),
  glowTarget: new Color(IDLE.theme.glow),
  accent: new Color(IDLE.theme.accent),
  accentTarget: new Color(IDLE.theme.accent),
  /** 鼠标位置，归一化到 -1..1 */
  pointer: { x: 0, y: 0 },
  /** 情绪切换瞬间的冲击量，会自然衰减 */
  pulse: 0,
}

export function setMoodTarget(key: EmotionKey) {
  const e = EMOTIONS[key]
  mood.key = key
  mood.eye = e.eye
  mood.target = { ...e.params }
  mood.glowTarget.set(e.theme.glow)
  mood.accentTarget.set(e.theme.accent)
  mood.pulse = 1
}

export function stepMood(dt: number) {
  const k = 1 - Math.exp(-dt * 5.2)
  const c = mood.current
  const t = mood.target

  for (const key of PARAM_KEYS) {
    c[key] += (t[key] - c[key]) * k
  }

  const kc = 1 - Math.exp(-dt * 4.2)
  mood.glow.lerp(mood.glowTarget, kc)
  mood.accent.lerp(mood.accentTarget, kc)
  mood.pulse *= Math.exp(-dt * 2.2)
}
