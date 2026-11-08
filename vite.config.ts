import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const EMOTIONS = [
  'idle', 'happy', 'shy', 'sleepy', 'curious', 'sad',
  'angry', 'surprised', 'thinking', 'bored', 'clingy',
] as const

/** JEV 决策模型的一句话选项描述 */
const CRITERIA: Record<string, string> = {
  idle: '平静、中性、没有明显情绪',
  happy: '开心、高兴、愉悦、被夸奖',
  shy: '害羞、不好意思、被夸得脸红',
  sleepy: '困倦、疲惫、想睡觉',
  curious: '好奇、疑惑、想问问题',
  sad: '难过、委屈、失落',
  angry: '生气、不满、被冒犯',
  surprised: '惊讶、意外、震惊',
  thinking: '思考、犹豫、拿不定主意',
  bored: '无聊、提不起兴趣',
  clingy: '撒娇、想被陪伴、黏人',
}

/**
 * 开发期代理：/api/classify → JEV /v1/decision
 *
 * NeoHorse-Jev-4B 是结构化决策模型，不是聊天模型，所以这里用 choice 题型：
 * 把 11 种情绪作为候选，直接拿 choice + probabilities。
 * API Key 只存在于服务端环境变量（.env.local），不会进入前端 bundle。
 */
function jevProxy(env: Record<string, string>): Plugin {
  return {
    name: 'nova-jev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/classify', (req, res) => {
        const json = (status: number, payload: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        }

        if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' })

        const apiKey = env.LLM_API_KEY
        if (!apiKey) return json(503, { error: 'LLM_API_KEY is not configured' })

        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk
          if (body.length > 8192) req.destroy()
        })
        req.on('end', async () => {
          try {
            const text = String(JSON.parse(body || '{}').text ?? '').slice(0, 500)
            if (!text) return json(400, { error: 'empty text' })

            const base = (env.LLM_BASE_URL || 'https://tokenrhythm.studio/v1').replace(/\/$/, '')
            const model = env.LLM_MODEL || 'NeoHorse-Jev-4B'

            const upstream = await fetch(`${base}/decision`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              signal: AbortSignal.timeout(12000),
              body: JSON.stringify({
                model,
                state: text,
                questions: {
                  emotion: {
                    type: 'choice',
                    instructions: '判断说话者当前最可能的情绪',
                    criteria: CRITERIA,
                  },
                },
              }),
            })

            if (!upstream.ok) {
              const detail = await upstream.text().catch(() => '')
              return json(502, {
                error: `upstream ${upstream.status}`,
                detail: detail.slice(0, 300),
              })
            }

            const data = (await upstream.json()) as {
              model?: string
              answers?: {
                emotion?: {
                  choice?: string
                  probabilities?: Record<string, number>
                }
              }
              input_tokens?: number
              decision_seconds?: number
            }

            const answer = data.answers?.emotion
            const choice = answer?.choice
            if (!choice || !EMOTIONS.includes(choice as (typeof EMOTIONS)[number])) {
              return json(502, { error: 'invalid model output' })
            }

            return json(200, {
              emotion: choice,
              score: Number(answer?.probabilities?.[choice] ?? 0.8),
              engine: `jev:${data.model ?? model}`,
              tokens: data.input_tokens ?? null,
              decisionMs: data.decision_seconds
                ? Math.round(data.decision_seconds * 1000)
                : null,
            })
          } catch (err) {
            return json(500, { error: String(err) })
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), jevProxy(env)],
    server: { port: 5173 },
  }
})
