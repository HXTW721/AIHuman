export type EmotionKey =
  | 'idle'
  | 'happy'
  | 'shy'
  | 'sleepy'
  | 'curious'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'
  | 'bored'
  | 'clingy'

export type EyeShape =
  | 'open'
  | 'happy'
  | 'shy'
  | 'sleepy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'
  | 'bored'
  | 'clingy'

/** 一组连续变化的角色参数。情绪 = 参数空间里的一个目标点。 */
export interface MoodParams {
  breathRate: number
  breathAmp: number
  bounce: number
  squash: number
  eyeOpen: number
  blush: number
  glow: number
  rise: number
  size: number
  arm: number
}

export interface EmotionTheme {
  glow: string
  ambient: string
  accent: string
}

export type LogSource = 'user' | 'quick' | 'system' | 'debug'

export interface LogEntry {
  id: number
  time: number
  source: LogSource
  text: string
}

export interface EmotionConfig {
  key: EmotionKey
  code: string
  name: string
  label: string
  desc: string
  valence: number
  arousal: number
  energy: number
  eye: EyeShape
  theme: EmotionTheme
  params: MoodParams
  replies: string[]
  decay?: number
  /** RobotExpressive 的动画片段名 */
  clip: string
}
