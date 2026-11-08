import type { EmotionKey } from '../types'
import type { EmotionRouter, RouteContext, RouteResult } from './types'

interface Rule {
  emotion: EmotionKey
  keys: string[]
  weight: number
}

/**
 * 关键词权重表。
 *
 * 同一情绪可以出现多条规则，分数会累加 —— 这样可以给「为什么」和「吗」
 * 这类强弱差别很大的词分配不同权重。
 */
const RULES: Rule[] = [
  { emotion: 'sad', keys: ['难过', '委屈', '伤心', '哭', '不开心', '失落', '失望', '孤单', '寂寞', '想哭', '难受'], weight: 2.4 },
  { emotion: 'angry', keys: ['生气', '讨厌', '哼', '气死', '烦死', '坏人', '过分', '骗', '滚', '气人'], weight: 2.4 },
  { emotion: 'sleepy', keys: ['困', '睡', '晚安', '累', '熬夜', '休息', '打盹', '闭眼', '好累'], weight: 2.2 },
  { emotion: 'bored', keys: ['无聊', '没意思', '好闲', '做什么', '干嘛呢', '没劲'], weight: 2.2 },
  { emotion: 'clingy', keys: ['抱抱', '抱', '陪我', '撒娇', '贴贴', '粘人', '别走', '陪我玩'], weight: 2.2 },
  { emotion: 'thinking', keys: ['想想', '思考', '怎么办', '考考', '难题', '让我想', '想一想'], weight: 2.0 },
  { emotion: 'surprised', keys: ['哇', '惊', '吓', '真的吗', '不会吧', '天哪', '居然', '没想到'], weight: 2.2 },
  { emotion: 'curious', keys: ['为什么', '好奇', '怎么', '哪', '多久', '谁'], weight: 1.8 },
  { emotion: 'curious', keys: ['什么', '吗'], weight: 0.8 },
  { emotion: 'happy', keys: ['开心', '高兴', '喜欢', '爱你', '棒', '厉害', '可爱', '乖', '谢谢', '夸', '么么', '亲', '好棒', '太好了', '牛', '强', '赞'], weight: 2.0 },
  { emotion: 'shy', keys: ['摸摸', '摸头', '害羞', '脸红', '羞', '好看', '亲亲'], weight: 2.2 },
]

const NEGATION = /(不|没|别|不太|不是)\s*(开心|高兴|喜欢|爱|棒|厉害|可爱|想)/
const INTENSIFIER = /(超级|非常|特别|太|超|好想)/

const EMOJI: Array<[RegExp, EmotionKey, number]> = [
  [/😊|😄|😁|😍|❤|💕/, 'happy', 1.8],
  [/😭|😢|🥺|💔/, 'sad', 2.0],
  [/😡|😠|💢/, 'angry', 2.0],
  [/😳|🫣|😶/, 'shy', 1.8],
  [/😴|💤|🥱/, 'sleepy', 2.0],
  [/😮|😲|😱/, 'surprised', 2.0],
  [/🤔/, 'thinking', 1.8],
  [/😐|🙄/, 'bored', 1.8],
  [/🥰|🫶|🤗/, 'clingy', 1.8],
]

const MIN_SCORE = 0.9

export const localRuleRouter: EmotionRouter = {
  name: 'local-rule-v1',

  classify(input: string, ctx: RouteContext): RouteResult {
    const start = performance.now()
    const text = input.trim()

    if (!text) {
      return { emotion: 'idle', score: 0, ms: 0, engine: 'local-rule-v1' }
    }

    const scores = new Map<EmotionKey, number>()
    const add = (emotion: EmotionKey, value: number) => {
      scores.set(emotion, (scores.get(emotion) ?? 0) + value)
    }

    for (const rule of RULES) {
      for (const key of rule.keys) {
        if (text.includes(key)) add(rule.emotion, rule.weight)
      }
    }

    // 「不开心」「不喜欢」这类否定，直接把分数给到委屈
    if (NEGATION.test(text)) add('sad', 2.6)

    if (/[!！]/.test(text)) {
      add('surprised', 0.7)
      add('happy', 0.35)
    }
    if (/[?？]/.test(text)) add('curious', 0.9)

    for (const [re, emotion, weight] of EMOJI) {
      if (re.test(text)) add(emotion, weight)
    }

    // 深夜更容易犯困
    if (ctx.hour >= 23 || ctx.hour < 5) add('sleepy', 0.7)

    // 连着被夸会开始害羞
    const happyStreak = ctx.recent.slice(-3).filter(k => k === 'happy').length
    if (happyStreak >= 2) add('shy', 0.8)

    let best: EmotionKey = 'idle'
    let bestRaw = 0
    for (const [emotion, score] of scores) {
      if (score > bestRaw) {
        bestRaw = score
        best = emotion
      }
    }

    const boost = INTENSIFIER.test(text) ? 1.3 : 1
    const score = Number((bestRaw * boost).toFixed(2))
    const ms = Math.round((performance.now() - start) * 100) / 100

    if (bestRaw < MIN_SCORE) {
      return { emotion: 'idle', score, ms, engine: 'local-rule-v1' }
    }
    return { emotion: best, score, ms, engine: 'local-rule-v1' }
  },
}
