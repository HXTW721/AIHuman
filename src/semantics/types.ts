import type { EmotionKey } from '../types'

export interface RouteContext {
  /** 0-23 点 */
  hour: number
  /** 最近的情绪序列，旧的在前 */
  recent: EmotionKey[]
}

export interface RouteResult {
  emotion: EmotionKey
  score: number
  /** 语义判定耗时（ms），调试台会展示 */
  ms: number
  /** 实际生效的判定引擎标识，例如 local-rule-v1 / remote-llm */
  engine?: string
}

/**
 * 语义路由接口。
 *
 * 默认实现是本地规则引擎（零依赖、无需 API Key）。
 * 想接大模型时，实现同一个接口并调用 setRouter() 即可，
 * store 和 UI 完全不需要改动。
 */
export interface EmotionRouter {
  readonly name: string
  classify(text: string, ctx: RouteContext): RouteResult
}
