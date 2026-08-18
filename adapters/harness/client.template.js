window.__ModuleLoader__.load({
  id: 'deepseek-time',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const { jsx, jsxs } = require('react/jsx-runtime')
    const { useEffect, useState } = require('react')

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
      return jsxs('aside', {
        role: 'status',
        'aria-label': `${state.label}: ${state.remainingText}`,
        title: state.label,
        style: { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', transform: 'translateY(22px)', width: 48 },
        children: [
          jsx('svg', { 'aria-hidden': true, fill: 'none', height: 30, viewBox: '0 0 50 50', width: 30, children: jsx('path', { d: DEEPSEEK_MARK_PATH, fill: state.color }) }),
          jsx('span', { style: { color: state.color, fontSize: 11, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap' }, children: state.remainingText }),
        ],
      })
    }

    const name = 'deepseek-time'
    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'deepseek-time',
        order: 20,
      }, DeepSeekTimeWidget))
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
