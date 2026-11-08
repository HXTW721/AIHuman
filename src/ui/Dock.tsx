import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useCompanion, type QuickAction } from '../store/companion'

const QUICK: Array<{ action: QuickAction; label: string }> = [
  { action: 'pat', label: '摸摸头' },
  { action: 'praise', label: '夸夸它' },
  { action: 'lull', label: '哄它睡觉' },
]

export function Dock() {
  const submitText = useCompanion(s => s.submitText)
  const previewText = useCompanion(s => s.previewText)
  const quick = useCompanion(s => s.quick)
  const [value, setValue] = useState('')
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const onChange = (next: string) => {
    setValue(next)
    clearTimeout(typingTimer.current)
    if (next.trim().length >= 2) {
      typingTimer.current = setTimeout(() => previewText(next), 380)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = value.trim()
    if (!text) return
    clearTimeout(typingTimer.current)
    submitText(text)
    setValue('')
  }

  return (
    <section className="absolute inset-x-0 bottom-7 z-30 flex flex-col items-center gap-4 px-6">
      <form
        onSubmit={onSubmit}
        className="composer flex h-[54px] w-full max-w-[560px] items-center gap-2.5 rounded-full border border-[#3b332a]/10 bg-[#fffcF6]/85 pl-5 pr-[7px] shadow-[0_18px_40px_-26px_rgba(70,45,20,0.65)] backdrop-blur-xl"
      >
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="和它说点什么…"
          autoComplete="off"
          spellCheck={false}
          aria-label="和角色对话"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium tracking-wide text-[#1f1a15] placeholder:text-[#8b7d6a] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="发送"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#080a12] transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--glow)', boxShadow: '0 0 18px -2px var(--glow)' }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {QUICK.map(q => (
          <button
            key={q.action}
            type="button"
            onClick={() => quick(q.action)}
            className="chip h-[33px] rounded-full border px-4 text-[12.5px] tracking-wide backdrop-blur-md transition active:scale-95"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#9a8a75]/80">
        试着对它说：今天好累啊
      </div>
    </section>
  )
}
