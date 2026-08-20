window.__ModuleLoader__.load({
  id: 'deepseek-time',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const { jsx, jsxs } = require('react/jsx-runtime')
    const { useEffect, useRef, useState } = require('react')

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
      const [manualPosition, setManualPosition] = useState(null)
      const [balance, setBalance] = useState(null)
      const [balanceStatus, setBalanceStatus] = useState('idle')
      const dragRef = useRef(null)
      const widgetRef = useRef(null)

      useEffect(() => {
        try {
          const saved = JSON.parse(localStorage.getItem('deepseek-time.position') || 'null')
          if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
            setManualPosition({ left: saved.left, top: saved.top })
          }
        } catch {}
      }, [])

      useEffect(() => {
        const clampPosition = () => {
          setManualPosition((current) => {
            if (!current || !widgetRef.current) return current
            const rect = widgetRef.current.getBoundingClientRect()
            const maxLeft = Math.max(0, window.innerWidth - rect.width)
            const maxTop = Math.max(0, window.innerHeight - rect.height)
            const next = {
              left: Math.min(Math.max(0, current.left), maxLeft),
              top: Math.min(Math.max(0, current.top), maxTop),
            }
            return next.left === current.left && next.top === current.top ? current : next
          })
        }
        window.addEventListener('resize', clampPosition)
        window.visualViewport?.addEventListener('resize', clampPosition)
        return () => {
          window.removeEventListener('resize', clampPosition)
          window.visualViewport?.removeEventListener('resize', clampPosition)
        }
      }, [])

      const loadBalance = () => {
        if (balanceStatus === 'loading') return
        setBalanceStatus('loading')
        fetch('/deepseek-time/balance.json', { cache: 'no-store' })
          .then((response) => response.json())
          .then((value) => {
            if (value?.ok) {
              setBalance({ amount: value.totalBalance, currency: value.currency, updatedAt: value.updatedAt })
              setBalanceStatus('ready')
            } else {
              setBalance(null)
              setBalanceStatus(value?.code === 'credential-missing' ? 'missing' : 'error')
            }
          })
          .catch(() => {
            setBalance(null)
            setBalanceStatus('error')
          })
      }

      const startDrag = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const element = widgetRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top }
        event.currentTarget.setPointerCapture?.(event.pointerId)
        event.preventDefault()
      }

      const moveDrag = (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId || !widgetRef.current) return
        const rect = widgetRef.current.getBoundingClientRect()
        const next = {
          left: Math.min(Math.max(0, drag.left + event.clientX - drag.startX), Math.max(0, window.innerWidth - rect.width)),
          top: Math.min(Math.max(0, drag.top + event.clientY - drag.startY), Math.max(0, window.innerHeight - rect.height)),
        }
        setManualPosition(next)
        event.preventDefault()
      }

      const endDrag = (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const rect = widgetRef.current?.getBoundingClientRect()
        if (rect) {
          const next = {
            left: Math.min(Math.max(0, drag.left + event.clientX - drag.startX), Math.max(0, window.innerWidth - rect.width)),
            top: Math.min(Math.max(0, drag.top + event.clientY - drag.startY), Math.max(0, window.innerHeight - rect.height)),
          }
          setManualPosition(next)
          try { localStorage.setItem('deepseek-time.position', JSON.stringify(next)) } catch {}
        }
        dragRef.current = null
      }

      const amountText = balance ? `${balance.currency === 'CNY' ? '¥' : balance.currency} ${Number(balance.amount).toFixed(2)}` : balanceStatus === 'missing' ? '未配置余额凭据' : balanceStatus === 'loading' ? '余额加载中' : '悬停查询余额'
      const positionStyle = manualPosition
        ? { left: manualPosition.left, top: manualPosition.top, bottom: 'auto' }
        : { bottom: 100, left: left ?? 0 }
      return jsxs('aside', {
        ref: widgetRef,
        role: 'status',
        'aria-label': `${state.label}: ${state.remainingText}；${amountText}`,
        title: `${state.label}；${amountText}`,
        onMouseEnter: loadBalance,
        onFocus: loadBalance,
        onPointerDown: startDrag,
        onPointerMove: moveDrag,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        style: { alignItems: 'center', bottom: positionStyle.bottom, display: 'flex', flexDirection: 'column', gap: 4, left: positionStyle.left, padding: '4px 0', position: 'fixed', top: positionStyle.top, touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'grab', visibility: manualPosition || left !== undefined ? 'visible' : 'hidden', width: 48, zIndex: 8 },
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
