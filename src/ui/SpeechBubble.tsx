import { useCompanion } from '../store/companion'

/**
 * 单个角色的对话气泡。
 *
 * 两个球各挂一个：左侧显示软体小生命的话，右侧显示机甲伴侣的话。
 * 系统提示只出现在左侧。
 */
export function SpeechBubble({ side }: { side: 'left' | 'right' }) {
  const bubble = useCompanion(s => s.bubble)

  const text =
    side === 'left' ? bubble?.text : bubble?.system ? null : bubble?.robot ?? null
  const show = Boolean(text)
  const isSystem = Boolean(bubble?.system) && side === 'left'

  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-30 w-max max-w-[280px] -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      }`}
      style={{ bottom: 'calc(100% + 14px)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`relative rounded-2xl border px-3.5 py-2.5 text-[13px] leading-relaxed shadow-[0_18px_40px_-22px_rgba(70,45,20,0.55)] backdrop-blur-xl ${
          isSystem
            ? 'border-dashed border-[#3b332a]/20 font-mono text-[11px] tracking-wide text-[#6b5e4f]'
            : 'bubble-tail border-[#3b332a]/10 text-[#3b332a]'
        }`}
        style={{ background: 'rgba(255, 252, 246, 0.94)' }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a8a75]">
          {isSystem ? 'system' : side === 'left' ? 'nova' : 'unit-07'}
        </div>
        {text}
      </div>
    </div>
  )
}
