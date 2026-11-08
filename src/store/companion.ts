import { create } from 'zustand'
import { EMOTIONS } from '../data/emotions'
import { ROBOT_REPLIES } from '../data/robotReplies'
import { setMoodTarget } from '../mood'
import { localRuleRouter } from '../semantics/localRouter'
import { classifyWithLLM } from '../semantics/llm'
import type { EmotionKey, LogEntry, LogSource } from '../types'

let uid = 1
let decayTimer: ReturnType<typeof setTimeout> | undefined
let bubbleTimer: ReturnType<typeof setTimeout> | undefined
let previewSeq = 0

const nextId = () => uid++

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const shorten = (text: string, max = 18) =>
  text.length > max ? text.slice(0, max) + '…' : text

const localClassify = (text: string, recent: EmotionKey[]) =>
  localRuleRouter.classify(text, { hour: new Date().getHours(), recent })

export interface RouteInfo {
  text: string
  emotion: EmotionKey
  score: number
  ms: number
  engine: string
  tokens?: number | null
  decisionMs?: number | null
}

export type LlmStatus = 'idle' | 'ok' | 'fallback'

export interface Bubble {
  id: number
  text: string
  system: boolean
  robot: string | null
}

export type QuickAction = 'pat' | 'praise' | 'lull'

const QUICK_MAP: Record<QuickAction, { emotion: EmotionKey; label: string }> = {
  pat: { emotion: 'shy', label: '摸摸头' },
  praise: { emotion: 'happy', label: '夸夸它' },
  lull: { emotion: 'sleepy', label: '哄它睡觉' },
}

/** 场景灯光主题色：调试台可以手动覆盖 */
export const SCENE_TINTS: Array<{ key: string; label: string; color: string | null }> = [
  { key: 'auto', label: 'Auto', color: null },
  { key: 'cyan', label: 'Cyan', color: '#35e0b0' },
  { key: 'amber', label: 'Amber', color: '#ffb35c' },
  { key: 'magenta', label: 'Magenta', color: '#ff7bb0' },
  { key: 'violet', label: 'Violet', color: '#a78bfa' },
]

interface CompanionState {
  emotion: EmotionKey
  recent: EmotionKey[]
  light: number
  tint: string | null
  llmStatus: LlmStatus
  logs: LogEntry[]
  bubble: Bubble | null
  lastRoute: RouteInfo | null

  addLog: (source: LogSource, text: string) => void
  applyEmotion: (key: EmotionKey, source: LogSource, note?: string, decay?: boolean) => void
  forceEmotion: (key: EmotionKey) => void
  quick: (action: QuickAction) => void
  submitText: (text: string) => void
  previewText: (text: string) => void
  say: (text: string, system?: boolean, robotText?: string) => void
  dismissBubble: () => void
  sendSystem: (text: string) => void
  setLight: (value: number) => void
  setTint: (color: string | null) => void
}

const bootLog: LogEntry = {
  id: nextId(),
  time: Date.now(),
  source: 'system',
  text: '角色已初始化 · EMO_IDLE_00',
}

export const useCompanion = create<CompanionState>()((set, get) => ({
  emotion: 'idle',
  recent: ['idle'],
  light: 0.8,
  tint: null,
  llmStatus: 'idle',
  logs: [bootLog],
  bubble: null,
  lastRoute: null,

  addLog: (source, text) => {
    const entry: LogEntry = { id: nextId(), time: Date.now(), source, text }
    set(state => ({ logs: [entry, ...state.logs].slice(0, 120) }))
  },

  applyEmotion: (key, source, note, decay = false) => {
    const emotion = EMOTIONS[key]
    clearTimeout(decayTimer)
    setMoodTarget(key)

    set(state => ({
      emotion: key,
      recent: [...state.recent, key].slice(-8),
    }))

    get().addLog(source, note ?? `→ ${emotion.code}`)

    if (decay && emotion.decay) {
      decayTimer = setTimeout(() => {
        get().applyEmotion('idle', 'system', '情绪自然衰减 → EMO_IDLE_00', false)
      }, emotion.decay)
    }
  },

  forceEmotion: key => {
    get().applyEmotion(key, 'debug', `[force] → ${EMOTIONS[key].code}`, false)
  },

  quick: action => {
    const { emotion, label } = QUICK_MAP[action]
    get().applyEmotion(emotion, 'quick', `[${label}] → ${EMOTIONS[emotion].code}`, true)
    get().say(pick(EMOTIONS[emotion].replies), false, pick(ROBOT_REPLIES[emotion]))
  },

  /** 回车：JEV 是唯一判定来源，只有请求失败时才回退本地规则 */
  submitText: async text => {
    const trimmed = text.trim()
    if (!trimmed) return

    const startedAt = performance.now()
    const remote = await classifyWithLLM(trimmed)
    const result = remote ?? localClassify(trimmed, get().recent)

    set({
      llmStatus: remote ? 'ok' : 'fallback',
      lastRoute: {
        text: trimmed,
        emotion: result.emotion,
        score: result.score,
        engine: remote ? remote.engine : 'local-rule-v1',
        tokens: remote?.tokens ?? null,
        decisionMs: remote?.decisionMs ?? null,
        ms: Math.round(performance.now() - startedAt),
      },
    })

    if (!remote) {
      get().addLog('system', 'JEV 不可用 · 已回退本地规则')
    }

    get().applyEmotion(
      result.emotion,
      'user',
      `"${shorten(trimmed)}" → ${EMOTIONS[result.emotion].code} · ${result.score.toFixed(2)}`,
      true,
    )
    get().say(
      pick(EMOTIONS[result.emotion].replies),
      false,
      pick(ROBOT_REPLIES[result.emotion]),
    )
  },

  /** 输入时：同样交给 JEV，旧请求用序号丢弃 */
  previewText: async text => {
    const trimmed = text.trim()
    if (trimmed.length < 2) return

    const seq = ++previewSeq
    const remote = await classifyWithLLM(trimmed)
    if (seq !== previewSeq) return

    const result = remote ?? localClassify(trimmed, get().recent)
    set({ llmStatus: remote ? 'ok' : 'fallback' })

    if (result.emotion !== get().emotion) {
      get().applyEmotion(
        result.emotion,
        'debug',
        `[typing] ${remote ? 'jev' : 'fallback'} → ${EMOTIONS[result.emotion].code}`,
        false,
      )
    }
  },

  say: (text, system = false, robotText = '') => {
    const bubble: Bubble = { id: nextId(), text, system, robot: robotText || null }
    set({ bubble })
    clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => set({ bubble: null }), 4600)
  },

  dismissBubble: () => {
    clearTimeout(bubbleTimer)
    set({ bubble: null })
  },

  sendSystem: text => {
    const trimmed = text.trim()
    if (!trimmed) return
    get().say(trimmed, true)
    get().addLog('system', trimmed)
  },

  setLight: value => set({ light: value }),

  setTint: color => {
    if (get().tint === color) return
    set({ tint: color })
    get().addLog('debug', `scene tint → ${color ?? 'auto'}`)
  },
}))
