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
</style></head><body>
<div id="status" role="status"><svg aria-hidden="true" viewBox="0 0 50 50"><path id="mark" d="${DEEPSEEK_MARK_PATH}"/></svg><span id="time"></span></div>
<script>${widgetScript}</script>
<script>
  const mark = document.getElementById('mark');
  const time = document.getElementById('time');
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
    status.setAttribute('aria-label', state.label + '，剩余 ' + state.remainingText);
    setTimeout(render, 1000 - (Date.now() % 1000));
  }
  render();
  void requestPictureInPicture();
</script></body></html>`
}

function toolResult() {
  const state = getDeepSeekTimeState()
  return {
    content: [{ type: 'text', text: `${state.label}，剩余 ${state.remainingText}` }],
    structuredContent: state,
    _meta: { ui: { resourceUri: WIDGET_URI } },
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
        _meta: { ui: { resourceUri: WIDGET_URI } },
      }],
    })
  }
  if (method === 'tools/call') {
    if (params.name !== 'show_deepseek_time') return failure(id, -32602, 'Unknown tool')
    return response(id, toolResult())
  }
  if (method === 'resources/list') {
    return response(id, { resources: [{ uri: WIDGET_URI, name: 'DeepSeek Time', mimeType: 'text/html;profile=mcp-app' }] })
  }
  if (method === 'resources/read') {
    if (params.uri !== WIDGET_URI) return failure(id, -32602, 'Unknown resource')
    return response(id, { contents: [{ uri: WIDGET_URI, mimeType: 'text/html;profile=mcp-app', text: widgetDocument() }] })
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
