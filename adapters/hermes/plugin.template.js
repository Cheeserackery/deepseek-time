import { STATUSBAR_AREAS } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

// The build script injects the shared time logic and supplied SVG path above.

function useClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let timeout
    const tick = () => {
      setNow(Date.now())
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    tick()
    return () => clearTimeout(timeout)
  }, [])
  return now
}

function DeepSeekTimeWidget() {
  const state = getDeepSeekTimeState(useClock())
  return jsxs('div', {
    role: 'status',
    'aria-label': `${state.label}: ${state.remainingText}`,
    title: state.label,
    className: 'flex h-5 items-center gap-1.5 px-1',
    children: [
      jsx('svg', {
        width: 18,
        height: 18,
        viewBox: '0 0 50 50',
        fill: 'none',
        'aria-hidden': true,
        style: { color: state.color },
        children: jsx('path', { d: DEEPSEEK_MARK_PATH, fill: 'currentColor' }),
      }),
      jsx('span', {
        className: 'whitespace-nowrap text-[0.6875rem] font-medium leading-none',
        style: { color: state.color },
        children: state.remainingText,
      }),
    ],
  })
}

export default {
  id: 'deepseek-time',
  name: 'DeepSeek Time',
  register(ctx) {
    ctx.register({
      id: 'statusbar-time',
      area: STATUSBAR_AREAS.left,
      order: 20,
      render: () => jsx(DeepSeekTimeWidget, {}),
    })
  },
}
