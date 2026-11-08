import { useState, type ReactNode } from 'react'
import { EMOTIONS, EMOTION_ORDER } from '../data/emotions'
import { SCENE_TINTS, useCompanion } from '../store/companion'
import type { LogSource } from '../types'

const SOURCE_CLASS: Record<LogSource, string> = {
  user: 'text-[#8fb6ff]',
  quick: 'text-[#ffb35c]',
  system: 'text-[#35e0b0]',
  debug: 'text-[#ff7bb0]',
}

const formatTime = (t: number) => new Date(t).toLocaleTimeString('zh-CN', { hour12: false })

function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase leading-none tracking-[0.16em] text-white/30">
      <span>{children}</span>
      {right}
    </div>
  )
}

export function MonitorConsole() {
  const emotion = useCompanion(s => s.emotion)
  const logs = useCompanion(s => s.logs)
  const light = useCompanion(s => s.light)
  const tint = useCompanion(s => s.tint)
  const lastRoute = useCompanion(s => s.lastRoute)
  const llmStatus = useCompanion(s => s.llmStatus)
  const setLight = useCompanion(s => s.setLight)
  const setTint = useCompanion(s => s.setTint)
  const forceEmotion = useCompanion(s => s.forceEmotion)
  const sendSystem = useCompanion(s => s.sendSystem)

  const [message, setMessage] = useState('')
  const config = EMOTIONS[emotion]

  const meters: Array<[string, number]> = [
    ['val', config.valence],
    ['aro', config.arousal],
    ['ene', config.energy],
  ]

  const send = () => {
    const text = message.trim()
    if (!text) return
    sendSystem(text)
    setMessage('')
  }

  const llmState =
    llmStatus === 'ok' ? 'online' : llmStatus === 'fallback' ? 'fallback' : 'standby'

  return (
    <div className="flex h-full flex-col bg-[#04060b]">
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-white/[0.07] px-3">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase leading-none tracking-[0.2em] text-white/45">
          <span className="live-dot h-1 w-1 rounded-full bg-emerald-400" />
          State Monitor
        </div>
        <div className="font-mono text-[8.5px] tracking-[0.14em] text-white/20">
          NOVA · v1.0
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr]">
        {/* 左栏 */}
        <div className="flex min-h-0 flex-col gap-3 border-r border-white/[0.06] px-3 py-2.5">
          <section>
            <Label right={<span className="tracking-normal text-white/35">{config.label}</span>}>
              Current State
            </Label>
            <div
              className="font-mono text-[19px] leading-none"
              style={{
                color: config.theme.glow,
                textShadow: `0 0 22px ${config.theme.glow}77`,
              }}
            >
              {config.code}
            </div>
            <div className="mt-1 text-[10px] leading-none text-white/30">{config.desc}</div>

            <div className="mt-2.5 space-y-1.5">
              {meters.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[44px_1fr_28px] items-center gap-2">
                  <span className="font-mono text-[9px] text-white/30">{label}</span>
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                    <i
                      className="block h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${value * 100}%`, background: config.theme.glow }}
                    />
                  </div>
                  <em className="text-right font-mono text-[9px] not-italic text-white/40">
                    {value.toFixed(2)}
                  </em>
                </div>
              ))}
            </div>
          </section>

          <section>
            <Label right={<span className="tracking-normal text-white/25">{EMOTION_ORDER.length}</span>}>
              Force State
            </Label>
            <div className="grid grid-cols-3 gap-1">
              {EMOTION_ORDER.map(key => {
                const item = EMOTIONS[key]
                const active = key === emotion
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => forceEmotion(key)}
                    className={`h-[25px] rounded border font-mono text-[9px] leading-none transition-all ${
                      active
                        ? 'border-transparent font-semibold text-[#080a12]'
                        : 'border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90'
                    }`}
                    style={
                      active
                        ? {
                            background: config.theme.glow,
                            boxShadow: `0 0 14px -4px ${config.theme.glow}`,
                          }
                        : undefined
                    }
                  >
                    {item.name}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <Label right={<span className="tracking-normal text-white/35">{llmState}</span>}>
              Semantics · JEV
            </Label>
            <div className="space-y-0.5 font-mono text-[8.5px] leading-[1.6] text-white/35">
              <div>{lastRoute?.engine ?? 'jev:NeoHorse-Jev-4B'}</div>
              {lastRoute && (
                <div className="truncate">
                  “{lastRoute.text}” → {EMOTIONS[lastRoute.emotion].code} ·{' '}
                  {lastRoute.score.toFixed(2)}
                </div>
              )}
              {lastRoute?.engine.startsWith('jev') && (
                <div className="text-white/25">
                  {lastRoute.tokens ?? '—'} tok · {lastRoute.decisionMs ?? '—'} ms · 往返{' '}
                  {lastRoute.ms.toFixed(0)} ms
                </div>
              )}
              {llmState === 'fallback' && (
                <div className="text-amber-300/60">JEV 不可用，正在使用本地兜底</div>
              )}
            </div>
          </section>
        </div>

        {/* 右栏 */}
        <div className="flex min-h-0 flex-col gap-2.5 px-3 py-2.5">
          <section>
            <Label right={<span className="tracking-normal text-white/40">{light.toFixed(2)}</span>}>
              Light
            </Label>
            <input
              type="range"
              min={0}
              max={1.4}
              step={0.01}
              value={light}
              onChange={e => setLight(Number(e.target.value))}
              aria-label="光强"
            />
            <div className="mt-1.5 flex items-center gap-1.5">
              {SCENE_TINTS.map(t => {
                const active = (t.color ?? null) === tint
                return (
                  <button
                    key={t.key}
                    type="button"
                    title={t.label}
                    onClick={() => setTint(t.color)}
                    className={`grid h-[18px] w-[18px] place-items-center rounded-full border transition ${
                      active
                        ? 'border-white/70 ring-1 ring-white/30'
                        : 'border-white/15 hover:border-white/40'
                    }`}
                    style={{
                      background: t.color ?? 'transparent',
                      boxShadow: t.color ? `0 0 10px -2px ${t.color}` : undefined,
                    }}
                  >
                    {!t.color && (
                      <span className="font-mono text-[7px] leading-none text-white/45">A</span>
                    )}
                  </button>
                )
              })}
              <span className="ml-0.5 font-mono text-[8px] text-white/25">{tint ?? 'auto'}</span>
            </div>
          </section>

          <section>
            <Label>System Message</Label>
            <div className="flex gap-1">
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="发送系统提示…"
                aria-label="系统提示内容"
                className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 text-[10px] text-white/90 placeholder:text-white/20 focus:border-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={send}
                className="h-7 shrink-0 rounded border border-white/10 bg-white/[0.045] px-2.5 font-mono text-[9px] text-white/55 transition hover:border-white/25 hover:text-white/90"
              >
                发送
              </button>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <Label
              right={
                <span className="tracking-normal text-white/40">
                  {String(logs.length).padStart(2, '0')}
                </span>
              }
            >
              Event Log
            </Label>
            <div className="min-h-0 flex-1 space-y-[1px] overflow-y-auto font-mono text-[9px] leading-[1.6]">
              {logs.map(entry => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-[44px_36px_1fr] gap-1 rounded px-1 py-[2px] ${
                    entry.id % 2 === 0 ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <time className="tabular-nums text-white/20">{formatTime(entry.time)}</time>
                  <span className={`uppercase tracking-wide ${SOURCE_CLASS[entry.source]}`}>
                    {entry.source}
                  </span>
                  <span className="break-words text-white/45">{entry.text}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
