import type { EmotionKey } from '../types'

export interface LlmClassification {
  emotion: EmotionKey
  score: number
  engine: string
  tokens?: number | null
  decisionMs?: number | null
}

const VALID: readonly EmotionKey[] = [
  'idle', 'happy', 'shy', 'sleepy', 'curious', 'sad',
  'angry', 'surprised', 'thinking', 'bored', 'clingy',
] as const

/**
 * 通过本地代理调用大模型做语义判定。
 *
 * 代理在 vite.config.ts 里（仅开发服务器），API Key 只存在于服务端环境变量，
 * 不会进前端 bundle。没有配置 Key 时接口返回 503，这里返回 null，
 * store 会自动回退到本地规则。
 */
export async function classifyWithLLM(
  text: string,
  timeoutMs = 6000,
): Promise<LlmClassification | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    if (!res.ok) return null

    const data = (await res.json()) as Partial<LlmClassification>
    if (!data.emotion || !VALID.includes(data.emotion)) return null

    const extra = data as LlmClassification
    return {
      emotion: data.emotion,
      score: Number(data.score) || 0,
      engine: data.engine ?? 'jev',
      tokens: extra.tokens ?? null,
      decisionMs: extra.decisionMs ?? null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
