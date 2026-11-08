import { CanvasCreature } from '../scene/CanvasCreature'
import { RobotStage } from '../scene/RobotStage'
import { MonitorConsole } from './MonitorConsole'
import { SpeechBubble } from './SpeechBubble'

/**
 * 白天工作台：
 *
 *   左侧玻璃投影球（软体小生命） · 中间显示器（显示器里就是调试台） · 右侧玻璃投影球（机甲伴侣）
 *
 * 房间与桌面是浅色的日光环境；球内与显示器保持暗场，
 * 情绪色只存在于「球里的世界」和球座的 LED 环上 —— 白天的真实感与夜间的辉光同时存在。
 */
export function DeskScene() {
  return (
    <>
      <div className="room" aria-hidden="true">
        <div className="room__window" />
        <div className="room__wall" />
      </div>
      <div className="desk" aria-hidden="true" />

      <div className="prop-plant" aria-hidden="true">
        <span className="leaf leaf--l" />
        <span className="leaf leaf--c" />
        <span className="leaf leaf--r" />
        <span className="pot" />
      </div>
      <div className="prop-mug" aria-hidden="true" />
      <div className="prop-book" aria-hidden="true" />
      <div className="prop-keyboard" aria-hidden="true" />
      <div className="prop-headphones" aria-hidden="true" />

      <div className="diorama">
        {/* 左：软体小生命 */}
        <div className="orb-wrap orb-wrap--left">
          <div className="orb">
            <div className="orb__glow" aria-hidden="true" />
            <div className="orb__cone" aria-hidden="true" />
            <div className="orb__inner">
              <CanvasCreature />
            </div>
            <div className="orb__scan" aria-hidden="true" />
            <div className="orb__dust" aria-hidden="true" />
            <div className="orb__glass" aria-hidden="true" />
          </div>
          <div className="orb__base" aria-hidden="true" />
          <SpeechBubble side="left" />
        </div>

        {/* 中：显示器里的调试台 */}
        <div className="monitor">
          <div className="monitor__body">
            <div className="monitor__screen">
              <MonitorConsole />
              <div className="monitor__glass" aria-hidden="true" />
            </div>
          </div>
          <div className="monitor__stand" aria-hidden="true" />
          <div className="monitor__base" aria-hidden="true" />
        </div>

        {/* 右：机甲伴侣 */}
        <div className="orb-wrap orb-wrap--right">
          <div className="orb">
            <div className="orb__glow" aria-hidden="true" />
            <div className="orb__cone" aria-hidden="true" />
            <div className="orb__inner">
              <RobotStage />
            </div>
            <div className="orb__scan" aria-hidden="true" />
            <div className="orb__dust" aria-hidden="true" />
            <div className="orb__glass" aria-hidden="true" />
          </div>
          <div className="orb__base" aria-hidden="true" />
          <SpeechBubble side="right" />
        </div>
      </div>
    </>
  )
}
