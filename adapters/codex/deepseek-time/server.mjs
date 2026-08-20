import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { DEEPSEEK_MARK_PATH } from './deepseek-mark.mjs'
import { getDeepSeekTimeState } from './time-state.mjs'

const widgetScript = await readFile(new URL('./time-state.browser.js', import.meta.url), 'utf8')
const WIDGET_URI = 'ui://deepseek-time/status.html'

function widgetDocument() {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0; background: transparent; }
  #status { align-items: center; display: flex; flex-direction: column; gap: 5px; padding: 8px; width: 52px; }
  svg { height: 32px; width: 32px; }
  #time { font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 650; line-height: 1; white-space: nowrap; }
  #balance { font-size: 11px; font-variant-numeric: tabular-nums; opacity: .82; white-space: nowrap; }
</style></head><body>
<div id="status" role="status"><svg aria-hidden="true" viewBox="0 0 50 50"><path id="mark" d="${DEEPSEEK_MARK_PATH}"/></svg><span id="time"></span><span id="balance"></span></div>
<script>${widgetScript}</script>
<script>
  const mark = document.getElementById('mark');
  const time = document.getElementById('time');
  const balance = document.getElementById('balance');
  const status = document.getElementById('status');
  async function requestPictureInPicture() {
    try {
      await globalThis.openai?.requestDisplayMode?.({ mode: 'pip' });
    } catch {
      // The host may not offer PiP; the inline card remains usable.
    }
  }
  function render() {
    const state = globalThis.DeepSeekTime.getDeepSeekTimeState();
    mark.setAttribute('fill', state.color);
    time.style.color = state.color;
    time.textContent = state.remainingText;
    const output = globalThis.openai?.toolOutput;
    const account = output?.balance;
    balance.textContent = account?.ok ? ((account.currency === 'CNY' ? '¥' : account.currency) + ' ' + Number(account.totalBalance).toFixed(2)) : '';
    balance.style.color = state.color;
    status.setAttribute('aria-label', state.label + '，剩余 ' + state.remainingText);
    status.title = state.label;
    setTimeout(render, 1000 - (Date.now() % 1000));
  }
  render();
  void requestPictureInPicture();
</script></body></html>`
}

async function queryBalance() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return { ok: false, code: 'credential-missing' }
  try {
    const response = await fetch('https://api.deepseek.com/user/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return { ok: false, code: 'upstream-unavailable' }
    const body = await response.json()
    const info = Array.isArray(body?.balance_infos) ? body.balance_infos[0] : undefined
    const totalBalance = Number(info?.total_balance)
    if (!info || !Number.isFinite(totalBalance)) return { ok: false, code: 'invalid-response' }
    return { ok: true, totalBalance, currency: typeof info.currency === 'string' ? info.currency : 'CNY', updatedAt: new Date().toISOString() }
  } catch {
    return { ok: false, code: 'upstream-unavailable' }
  }
}

async function toolResult() {
  const state = getDeepSeekTimeState()
  const balance = await queryBalance()
  const balanceText = balance.ok
    ? `，余额 ${(balance.currency === 'CNY' ? '¥' : balance.currency)} ${balance.totalBalance.toFixed(2)}`
    : balance.code === 'credential-missing' ? '，未配置可读取的 DEEPSEEK_API_KEY' : '，余额暂时无法获取'
  return {
    content: [{ type: 'text', text: `${state.label}，剩余 ${state.remainingText}${balanceText}` }],
    structuredContent: { ...state, balance },
    _meta: { 'openai/outputTemplate': WIDGET_URI },
  }
}

function response(id, result) {
  return { jsonrpc: '2.0', id, result }
}

function failure(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

async function handle(message) {
  const { id, method, params = {} } = message
  if (id === undefined) return undefined
  if (method === 'initialize') {
    return response(id, {
      protocolVersion: params.protocolVersion ?? '2025-06-18',
      capabilities: { resources: {}, tools: {} },
      serverInfo: { name: 'deepseek-time', version: '0.1.0' },
    })
  }
  if (method === 'tools/list') {
    return response(id, {
      tools: [{
        name: 'show_deepseek_time',
        description: 'Show the current DeepSeek pricing period and its remaining time in Beijing time.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        _meta: { 'openai/outputTemplate': WIDGET_URI },
      }],
    })
  }
  if (method === 'tools/call') {
    if (params.name !== 'show_deepseek_time') return failure(id, -32602, 'Unknown tool')
    return response(id, await toolResult())
  }
  if (method === 'resources/list') {
    return response(id, { resources: [{ uri: WIDGET_URI, name: 'DeepSeek Time', mimeType: 'text/html;profile=mcp-app' }] })
  }
  if (method === 'resources/read') {
    if (params.uri !== WIDGET_URI) return failure(id, -32602, 'Unknown resource')
    return response(id, { contents: [{
      uri: WIDGET_URI,
      mimeType: 'text/html;profile=mcp-app',
      text: widgetDocument(),
      _meta: {
        'openai/widgetDescription': 'A live DeepSeek pricing-period countdown.',
        'openai/widgetPrefersBorder': false,
      },
    }] })
  }
  return failure(id, -32601, 'Method not found')
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
for await (const line of input) {
  if (line.trim() === '') continue
  try {
    const result = await handle(JSON.parse(line))
    if (result !== undefined) process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    process.stdout.write(`${JSON.stringify(failure(null, -32700, error instanceof Error ? error.message : 'Parse error'))}\n`)
  }
}
