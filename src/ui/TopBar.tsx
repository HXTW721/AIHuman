import { EMOTIONS } from '../data/emotions'
import { useCompanion } from '../store/companion'

export function TopBar() {
  const emotion = useCompanion(s => s.emotion)
  const config = EMOTIONS[emotion]

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
      <div className="flex items-center gap-3">
        <span
          className="h-2.5 w-2.5 rounded-full transition-colors duration-700"
          style={{
            background: config.theme.glow,
            boxShadow: `0 0 12px ${config.theme.glow}, 0 0 26px ${config.theme.glow}55`,
          }}
        />
        <div>
          <div className="text-[13px] font-bold leading-none tracking-[0.28em] text-[#3b332a]">
            NOVA
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a8a75]">
            companion unit · v1.0
          </div>
        </div>
      </div>

      <div className="flex h-8 items-center gap-2 rounded-full border border-[#3b332a]/10 bg-white/65 px-3.5 shadow-[0_6px_16px_-10px_rgba(70,45,20,0.5)] backdrop-blur-md">
        <span
          className="h-1.5 w-1.5 rounded-full transition-colors duration-700"
          style={{ background: config.theme.glow, boxShadow: `0 0 8px ${config.theme.glow}` }}
        />
        <span className="font-mono text-[10px] tracking-wide text-[#6b5e4f]">{config.code}</span>
      </div>
    </header>
  )
}
