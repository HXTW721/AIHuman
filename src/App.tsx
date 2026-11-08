import { useEffect } from 'react'
import { EMOTIONS } from './data/emotions'
import { mood } from './mood'
import { MoodDriver } from './MoodDriver'
import { useCompanion } from './store/companion'
import { DeskScene } from './ui/DeskScene'
import { Dock } from './ui/Dock'
import { TopBar } from './ui/TopBar'

export default function App() {
  const emotion = useCompanion(s => s.emotion)
  const tint = useCompanion(s => s.tint)
  const config = EMOTIONS[emotion]

  // 情绪主题 → CSS 变量；场景灯光可以被调试台手动覆盖
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--glow', config.theme.glow)
    root.style.setProperty('--accent', config.theme.accent)
    root.style.setProperty('--ambient', config.theme.ambient)
    root.style.setProperty('--scene-glow', tint ?? config.theme.glow)
  }, [config, tint])

  // 鼠标位置驱动两个角色的视线与朝向
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mood.pointer.x = (e.clientX / window.innerWidth - 0.5) * 2
      mood.pointer.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // 开场问候
  useEffect(() => {
    const timer = setTimeout(() => {
      useCompanion.getState().say('嗨，我是 NOVA。今天想怎么过？', false, '连接已建立。请开始。')
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <MoodDriver />
      <DeskScene />
      <div className="grain" aria-hidden="true" />
      <TopBar />
      <Dock />
    </div>
  )
}
