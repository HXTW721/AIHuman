import { useEffect } from 'react'
import { stepMood } from './mood'

/**
 * 情绪参数驱动器。
 *
 * 必须挂在两个舞台之外 —— 之前的版本把它放在 3D 场景里，
 * 切到 Canvas 舞台后场景被卸载，参数就不再做插值了。
 */
export function MoodDriver() {
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05)
      last = now
      stepMood(dt)
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return null
}
