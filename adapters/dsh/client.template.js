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

    function useSidebarDockLeft() {
      const [left, setLeft] = useState()
      useEffect(() => {
        const frame = document.querySelector('[style*="grid-template-columns"]')
        const sidebar = frame?.firstElementChild
        if (frame === null || !(sidebar instanceof HTMLElement)) return

        let animationFrame
        const update = () => {
          if (animationFrame !== undefined) return
          animationFrame = requestAnimationFrame(() => {
            animationFrame = undefined
            const nextLeft = Math.round(sidebar.getBoundingClientRect().right + 6)
            if (!Number.isFinite(nextLeft)) return
            setLeft((current) => current === nextLeft ? current : nextLeft)
          })
        }
        update()
        const resizeObserver = new ResizeObserver(update)
        resizeObserver.observe(sidebar)
        resizeObserver.observe(frame)
        const mutationObserver = new MutationObserver(update)
        mutationObserver.observe(frame, { attributes: true, attributeFilter: ['class', 'style'] })
        window.addEventListener('resize', update)
        window.visualViewport?.addEventListener('resize', update)
        return () => {
          if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
          resizeObserver.disconnect()
          mutationObserver.disconnect()
          window.removeEventListener('resize', update)
          window.visualViewport?.removeEventListener('resize', update)
        }
      }, [])
      return left
    }

    function DeepSeekTimeWidget() {
      const state = getDeepSeekTimeState(useClock())
      const left = useSidebarDockLeft()
      return jsxs('aside', {
        role: 'status',
        'aria-label': `${state.label}: ${state.remainingText}`,
        title: state.label,
        style: { alignItems: 'center', bottom: 100, display: 'flex', flexDirection: 'column', gap: 4, left: left ?? 0, padding: '4px 0', position: 'fixed', visibility: left === undefined ? 'hidden' : 'visible', width: 48, zIndex: 8 },
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
