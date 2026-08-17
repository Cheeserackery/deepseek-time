import { useEffect, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import React from 'react'
import { DEEPSEEK_MARK_PATH } from './deepseek-mark.mjs'
import { getDeepSeekTimeState } from './time-state.mjs'

export const name = 'deepseek-time'
export const inject = ['slots']

function useClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const tick = (): void => {
      setNow(Date.now())
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    tick()
    return () => clearTimeout(timeout)
  }, [])
  return now
}

function DeepSeekTimeWidget(): React.ReactElement {
  const state = getDeepSeekTimeState(useClock())
  return (
    <aside
      aria-label={`${state.label}，剩余 ${state.remainingText}`}
      title={state.label}
      style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', width: 48 }}
    >
      <svg aria-hidden="true" fill="none" height="30" viewBox="0 0 50 50" width="30">
        <path d={DEEPSEEK_MARK_PATH} fill={state.color} />
      </svg>
      <span style={{ color: state.color, fontSize: 11, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap' }}>
        {state.remainingText}
      </span>
    </aside>
  )
}

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'deepseek-time',
    order: 20,
  }, DeepSeekTimeWidget))
}
