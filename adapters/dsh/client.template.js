window.__ModuleLoader__.load({
  id: 'deepseek-time',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const { jsx, jsxs } = require('react/jsx-runtime')
    const { useEffect, useRef, useState } = require('react')

    // The build script injects the shared time logic and supplied SVG path above.

    /** LocalStorage seat of a user-dragged position, in frame-overlay coordinates. */
    const POSITION_KEY = 'deepseek-time.position'
    /** Host-side balance route registered by lib/index.js. */
    const BALANCE_ENDPOINT = '/deepseek-time/balance.json'
    /** Gap between the sidebar column and the default pill position. */
    const SIDEBAR_GAP = 6
    /** Default bottom inset, clear of the composer card. */
    const BOTTOM_INSET = 96
    /** Pill width in px; kept here because the default position and the hover card need it. */
    const PILL_WIDTH = 52
    /** Approximate width of the hover card, used to pick its side. */
    const CARD_WIDTH = 184

    const ZH = (() => {
      try {
        const language = (document.documentElement.lang || navigator.language || 'zh').toLowerCase()
        return language.startsWith('zh')
      } catch {
        return true
      }
    })()

    const TEXT = ZH
      ? {
          peak: '高峰时段',
          idle: '空闲时段',
          next: '下次切换',
          balance: '余额',
          loading: '查询中',
          missing: '未配置 DEEPSEEK_API_KEY',
          error: '查询失败',
          hint: '拖拽移动，双击复位',
        }
      : {
          peak: 'Peak hours',
          idle: 'Off-peak',
          next: 'Next change',
          balance: 'Balance',
          loading: 'Loading',
          missing: 'DEEPSEEK_API_KEY is not configured',
          error: 'Balance unavailable',
          hint: 'Drag to move, double-click to reset',
        }

    /** Locale tag handed to Intl; the countdown rules themselves always use Beijing time. */
    const DATE_LOCALE = ZH ? 'zh-CN' : 'en-US'
    /** Phrase separator matching the UI language. */
    const SEP = ZH ? '，' : ', '

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max)
    }

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

    /**
     * Measure the sidebar column's right edge and the viewport. The widget mounts into the
     * frame-wide `shell.overlay` slot and positions itself in viewport coordinates, so this is
     * the only DOM contract it relies on: the documented overlay attribute and the sidebar's
     * grid seat. Layout changes, sidebar collapse, drawer mode, and window resizes all feed a
     * single measurement pass.
     */
    function useFrameGeometry(rootRef) {
      const [geometry, setGeometry] = useState(null)
      useEffect(() => {
        const root = rootRef.current
        const layer = root?.closest?.('[data-shell-overlay]') ?? document.querySelector('[data-shell-overlay]')
        const frame = layer?.parentElement

        let frameRequest
        const measure = () => {
          const width = window.innerWidth
          const height = window.innerHeight
          if (!(width > 0 && height > 0)) return
          let sidebarRight = 0
          if (frame instanceof HTMLElement) {
            for (const child of frame.children) {
              if (!(child instanceof HTMLElement)) continue
              const style = getComputedStyle(child)
              if (style.gridRowStart !== '1' || style.gridColumnStart !== '1') continue
              if (style.position === 'absolute' || style.position === 'fixed') continue
              const rect = child.getBoundingClientRect()
              if (rect.width > 0) {
                sidebarRight = rect.right
                break
              }
            }
            if (sidebarRight === 0) {
              const track = Number.parseFloat(getComputedStyle(frame).gridTemplateColumns)
              if (Number.isFinite(track)) sidebarRight = frame.getBoundingClientRect().left + track
            }
          }
          const next = {
            sidebarRight: Math.round(sidebarRight),
            width: Math.round(width),
            height: Math.round(height),
          }
          setGeometry((current) => current
            && current.sidebarRight === next.sidebarRight
            && current.width === next.width
            && current.height === next.height
            ? current
            : next)
        }
        const schedule = () => {
          if (frameRequest !== undefined) return
          frameRequest = requestAnimationFrame(() => {
            frameRequest = undefined
            measure()
          })
        }

        measure()
        const resizeObserver = new ResizeObserver(schedule)
        if (frame instanceof HTMLElement) {
          resizeObserver.observe(frame)
          for (const child of frame.children) if (child instanceof HTMLElement) resizeObserver.observe(child)
        }
        let mutationObserver
        if (frame instanceof HTMLElement) {
          mutationObserver = new MutationObserver(schedule)
          mutationObserver.observe(frame, { attributes: true, attributeFilter: ['class', 'style', 'data-sidebar-collapsed', 'data-sidebar-drawer'] })
        }
        window.addEventListener('resize', schedule)
        window.visualViewport?.addEventListener('resize', schedule)
        return () => {
          if (frameRequest !== undefined) cancelAnimationFrame(frameRequest)
          resizeObserver.disconnect()
          mutationObserver?.disconnect()
          window.removeEventListener('resize', schedule)
          window.visualViewport?.removeEventListener('resize', schedule)
        }
      }, [rootRef])
      return geometry
    }

    function formatBoundary(epochMs) {
      try {
        return new Intl.DateTimeFormat(DATE_LOCALE, {
          timeZone: BEIJING_TIME_ZONE,
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(epochMs))
      } catch {
        return ''
      }
    }

    function formatAmount(balance) {
      if (!balance || !Number.isFinite(balance.amount)) return undefined
      const symbol = balance.currency === 'CNY' ? '¥' : balance.currency === 'USD' ? '$' : `${balance.currency} `
      return `${symbol}${balance.amount.toFixed(2)}`
    }

    function DeepSeekTimeWidget() {
      const state = getDeepSeekTimeState(useClock())
      const rootRef = useRef(null)
      const dragRef = useRef(null)
      const geometry = useFrameGeometry(rootRef)
      const [savedPosition, setSavedPosition] = useState(null)
      const [draftPosition, setDraftPosition] = useState(null)
      const [hovered, setHovered] = useState(false)
      const [balance, setBalance] = useState(null)
      const [balanceStatus, setBalanceStatus] = useState('idle')

      // Restore the last dragged position; a missing or malformed record keeps the default dock.
      useEffect(() => {
        try {
          const raw = window.localStorage.getItem(POSITION_KEY)
          if (!raw) return
          const saved = JSON.parse(raw)
          if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
            setSavedPosition({ left: saved.left, top: saved.top })
          }
        } catch {
          /* private mode or a hand-edited record: keep the default position */
        }
      }, [])

      // Keep a dragged position inside the frame when the window or sidebar changes size.
      useEffect(() => {
        if (!geometry) return
        const root = rootRef.current
        const width = root?.offsetWidth ?? PILL_WIDTH
        const height = root?.offsetHeight ?? 64
        setSavedPosition((current) => {
          if (!current) return current
          const left = clamp(current.left, 0, Math.max(0, geometry.width - width))
          const top = clamp(current.top, 0, Math.max(0, geometry.height - height))
          return left === current.left && top === current.top ? current : { left, top }
        })
        setDraftPosition((current) => {
          if (!current) return current
          const left = clamp(current.left, 0, Math.max(0, geometry.width - width))
          const top = clamp(current.top, 0, Math.max(0, geometry.height - height))
          return left === current.left && top === current.top ? current : { left, top }
        })
      }, [geometry])

      const loadBalance = () => {
        if (balanceStatus === 'loading') return
        setBalanceStatus('loading')
        fetch(BALANCE_ENDPOINT, { cache: 'no-store', headers: { accept: 'application/json' } })
          .then((response) => (response.ok ? response.json() : { ok: false, code: 'upstream-unavailable' }))
          .then((value) => {
            if (value?.ok) {
              const amount = Number(value.totalBalance)
              if (!Number.isFinite(amount)) {
                setBalance(null)
                setBalanceStatus('error')
                return
              }
              setBalance({ amount, currency: typeof value.currency === 'string' ? value.currency : 'CNY' })
              setBalanceStatus('ready')
              return
            }
            setBalance(null)
            setBalanceStatus(value?.code === 'credential-missing' ? 'missing' : 'error')
          })
          .catch(() => {
            setBalance(null)
            setBalanceStatus('error')
          })
      }

      const beginDrag = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const root = rootRef.current
        if (!root) return
        const rect = root.getBoundingClientRect()
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          left: rect.left,
          top: rect.top,
          maxLeft: Math.max(0, window.innerWidth - rect.width),
          maxTop: Math.max(0, window.innerHeight - rect.height),
        }
        setDraftPosition({ left: Math.round(rect.left), top: Math.round(rect.top) })
        event.currentTarget.setPointerCapture?.(event.pointerId)
        event.preventDefault()
      }

      const positionOf = (drag, event) => ({
        left: Math.round(clamp(drag.left + event.clientX - drag.startX, 0, drag.maxLeft)),
        top: Math.round(clamp(drag.top + event.clientY - drag.startY, 0, drag.maxTop)),
      })

      const moveDrag = (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        setDraftPosition(positionOf(drag, event))
        event.preventDefault()
      }

      const endDrag = (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const next = positionOf(drag, event)
        dragRef.current = null
        setDraftPosition(null)
        setSavedPosition(next)
        try {
          window.localStorage.setItem(POSITION_KEY, JSON.stringify(next))
        } catch {
          /* the position is a convenience, not part of the plugin contract */
        }
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        event.preventDefault()
      }

      const resetPosition = () => {
        dragRef.current = null
        setDraftPosition(null)
        setSavedPosition(null)
        try {
          window.localStorage.removeItem(POSITION_KEY)
        } catch {
          /* nothing persisted to clear */
        }
      }

      const position = draftPosition ?? savedPosition
      const left = position ? position.left : geometry ? geometry.sidebarRight + SIDEBAR_GAP : undefined
      const placeCardRight = geometry === null || (left ?? 0) + PILL_WIDTH + CARD_WIDTH + 16 <= geometry.width
      const phaseLabel = state.phase === 'peak' ? TEXT.peak : TEXT.idle
      const amountText = formatAmount(balance)
      const statusText = amountText
        ?? (balanceStatus === 'loading' ? TEXT.loading : balanceStatus === 'missing' ? TEXT.missing : balanceStatus === 'error' ? TEXT.error : '')

      const pillStyle = {
        alignItems: 'center',
        background: 'var(--dsw-alias-bg-overlay, rgba(255, 255, 255, 0.92))',
        border: '0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12))',
        borderRadius: 12,
        boxShadow: 'var(--dsw-elevation-prominent, 0 2px 10px rgba(0, 0, 0, 0.16))',
        boxSizing: 'border-box',
        cursor: dragRef.current === null ? 'grab' : 'grabbing',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: PILL_WIDTH,
        padding: '6px 4px',
        touchAction: 'none',
        userSelect: 'none',
      }

      const rootStyle = {
        bottom: position ? 'auto' : BOTTOM_INSET,
        left,
        position: 'fixed',
        top: position ? position.top : undefined,
        visibility: geometry === null ? 'hidden' : 'visible',
        zIndex: 1,
      }

      const cardStyle = {
        background: 'var(--dsw-alias-bg-overlay, rgba(255, 255, 255, 0.98))',
        border: '0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12))',
        borderRadius: 10,
        boxShadow: 'var(--dsw-elevation-prominent, 0 8px 24px rgba(0, 0, 0, 0.18))',
        color: 'var(--dsw-alias-label-secondary, #5b5f66)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        pointerEvents: 'none',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: CARD_WIDTH,
        ...(placeCardRight ? { left: 'calc(100% + 8px)' } : { right: 'calc(100% + 8px)' }),
      }

      const row = (label, value, color) => jsxs('div', {
        style: { alignItems: 'center', display: 'flex', fontSize: 11, gap: 6, justifyContent: 'space-between', lineHeight: 1.3, whiteSpace: 'nowrap' },
        children: [
          jsx('span', { style: { color: 'var(--dsw-alias-label-tertiary, #8a8f98)' }, children: label }),
          jsx('span', { style: { color: color ?? 'var(--dsw-alias-label-primary, #1f2329)', fontWeight: 600 }, children: value }),
        ],
      })

      return jsxs('aside', {
        ref: rootRef,
        role: 'status',
        'aria-live': 'off',
        'aria-label': `${phaseLabel}${SEP}${state.remainingText}${statusText ? `${SEP}${TEXT.balance} ${statusText}` : ''}`,
        tabIndex: 0,
        onMouseEnter: () => {
          setHovered(true)
          loadBalance()
        },
        onMouseLeave: () => setHovered(false),
        onFocus: () => {
          setHovered(true)
          loadBalance()
        },
        onBlur: () => setHovered(false),
        style: rootStyle,
        children: [
          jsxs('div', {
            'aria-hidden': true,
            onPointerDown: beginDrag,
            onPointerMove: moveDrag,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onDoubleClick: resetPosition,
            style: pillStyle,
            children: [
              jsx('svg', {
                fill: 'none',
                height: 26,
                viewBox: '0 0 50 50',
                width: 26,
                children: jsx('path', { d: DEEPSEEK_MARK_PATH, fill: state.color }),
              }),
              jsx('span', {
                style: { color: state.color, fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap' },
                children: state.remainingText,
              }),
            ],
          }),
          hovered
            ? jsxs('div', {
                role: 'tooltip',
                style: cardStyle,
                children: [
                  jsxs('div', {
                    style: { alignItems: 'center', display: 'flex', fontSize: 12, fontWeight: 600, gap: 6, lineHeight: 1.3, whiteSpace: 'nowrap' },
                    children: [
                      jsx('span', { 'aria-hidden': true, style: { background: state.color, borderRadius: '50%', display: 'inline-block', height: 7, width: 7 } }),
                      jsx('span', { style: { color: state.color }, children: phaseLabel }),
                    ],
                  }),
                  row(TEXT.next, formatBoundary(state.nextBoundary)),
                  row(TEXT.balance, statusText, balanceStatus === 'error' || balanceStatus === 'missing' ? 'var(--dsw-alias-state-warn-label, #b25c00)' : undefined),
                  jsx('div', {
                    style: { color: 'var(--dsw-alias-label-tertiary, #8a8f98)', fontSize: 10, lineHeight: 1.3, whiteSpace: 'nowrap' },
                    children: TEXT.hint,
                  }),
                ],
              })
            : null,
        ],
      })
    }

    const name = 'deepseek-time'
    const inject = ['slots']
    function apply(ctx) {
      // `shell.overlay` (declared by @deepseek-ai/dsh-client-ui-layout) is the frame-wide
      // floating layer: it stays mounted across sessions and sits outside every scroll
      // container, which is what a status pill that can be dragged anywhere needs.
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
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
