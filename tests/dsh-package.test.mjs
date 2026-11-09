import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adapterDir = join(root, 'adapters', 'dsh')
const manifestPath = join(adapterDir, 'package.json')

/** Read and parse a JSON file. */
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

/** Resolve a manifest-relative path and reject paths that escape the adapter directory. */
function insideAdapter(manifest, relativePath) {
  const target = resolve(adapterDir, relativePath)
  const offset = relative(adapterDir, target)
  assert.ok(offset !== '' && !offset.startsWith('..') && !offset.includes(':'), `${relativePath} must stay inside adapters/dsh`)
  return target
}

/** Load the built client bundle in a sandbox and return the captured module-loader registration. */
async function loadClientRegistration() {
  const code = await readFile(join(adapterDir, 'lib', 'client.js'), 'utf8')
  let registration
  const context = vm.createContext({
    window: {
      __ModuleLoader__: {
        load(candidate) {
          registration = candidate
        },
      },
    },
  })
  new vm.Script(code, { filename: 'adapters/dsh/lib/client.js' }).runInContext(context)
  assert.ok(registration !== undefined, 'client bundle must call window.__ModuleLoader__.load')
  return registration
}

/** Minimal React stand-in: a single render reads initial state and effects do not run. */
function stubReact() {
  return {
    useEffect() {},
    useRef(initial) {
      return { current: initial }
    },
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
  }
}

/** Walk a rendered jsx/jsxs tree depth-first. */
function* walk(node) {
  if (node === null || node === undefined || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child)
    return
  }
  yield node
  yield* walk(node.props?.children)
}

test('DSH adapter manifest declares the 0.2.2 bundle, client, and metadata contract', async () => {
  const manifest = await readJson(manifestPath)
  assert.equal(manifest.name, 'deepseek-time')
  assert.match(manifest.version, /^\d+\.\d+\.\d+/)
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.private, true)
  assert.equal(manifest.main, 'lib/index.js')
  assert.equal(manifest.icon, './icon.svg')

  assert.equal(manifest.dsh?.manifestVersion, 1)
  // Verified against dsh 0.2.2-rc.1 app-boot: accepted by 0.2.x at or above the rc, rejected before it.
  assert.equal(manifest.engines?.dsh, '^0.2.2-rc.1')

  assert.equal(manifest.dsh?.client?.platform, 'web')
  assert.deepEqual(manifest.dsh?.client?.inject, ['@deepseek-ai/dsh-client-ui-layout'])
  assert.equal(manifest.dsh?.client?.immediately, true)
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')

  for (const entry of ['.', './client', './icon', './package.json']) {
    assert.ok(manifest.exports?.[entry], `exports[${JSON.stringify(entry)}] must exist`)
    assert.ok(existsSync(insideAdapter(manifest, manifest.exports[entry])), `exports[${JSON.stringify(entry)}] must resolve`)
  }
  // DSH resolves plugin metadata through exported resources, so locale files need a subpath export.
  assert.equal(manifest.exports['./locale/*.json'], './locale/*.json')
})

test('DSH bundle patch selects exactly one deepseek-time loader row', async () => {
  const manifest = await readJson(manifestPath)
  const patchPath = insideAdapter(manifest, manifest.dsh.bundle.patch)
  assert.ok(existsSync(patchPath))
  const patch = await readFile(patchPath, 'utf8')
  assert.match(patch, /insert:/)
  assert.match(patch, /id: deepseek-time/)
  assert.match(patch, /name: 'deepseek-time'/)
})

test('DSH plugin-manager metadata resolves from package files', async () => {
  const manifest = await readJson(manifestPath)

  const iconPath = insideAdapter(manifest, manifest.icon)
  const iconStats = await stat(iconPath)
  assert.ok(iconStats.isFile())
  assert.ok(iconStats.size > 0 && iconStats.size <= 256 * 1024, 'dsh plugin icons cap at 256 KiB')
  assert.match(await readFile(iconPath, 'utf8'), /^<svg[\s>]/)

  for (const language of ['en', 'zh']) {
    const locale = await readJson(join(adapterDir, 'locale', `${language}.json`))
    assert.equal(typeof locale.meta?.title, 'string')
    assert.ok(locale.meta.title.length > 0)
    assert.equal(typeof locale.meta?.description, 'string')
    assert.ok(locale.meta.description.length > 0)
    // A declared detail document is read from the package root and must exist.
    assert.ok(locale.meta.detail, `${language} locale must name its detail document`)
    const detailPath = insideAdapter(manifest, locale.meta.detail)
    assert.ok(existsSync(detailPath), `${language} detail document must exist`)
  }
})

test('DSH client bundle registers the shell.overlay status pill', async () => {
  const manifest = await readJson(manifestPath)
  const source = await readFile(join(adapterDir, 'lib', 'client.js'), 'utf8')

  // The module id must match the package name: the client module loader keys factories by it.
  assert.ok(source.includes(`id: '${manifest.name}'`), 'loader id must equal the package name')
  assert.ok(source.includes('shell.overlay'), 'the widget belongs in the frame-wide overlay slot')
  assert.ok(source.includes('data-shell-overlay'), 'positioning must use the documented layer attribute')
  assert.ok(!source.includes('conversation.input.dock'), 'the session-scoped composer dock is no longer used')

  const registration = await loadClientRegistration()
  assert.equal(registration.id, 'deepseek-time')
  assert.equal(typeof registration.factory, 'function')

  const react = stubReact()
  const jsx = (type, props) => ({ type, props })
  const jsxs = (type, props) => ({ type, props })
  const exports = registration.factory((specifier) => {
    if (specifier === 'react') return react
    if (specifier === 'react/jsx-runtime') return { jsx, jsxs }
    throw new Error(`unexpected require(${JSON.stringify(specifier)})`)
  })

  assert.equal(exports.name, 'deepseek-time')
  // The bundle runs in another realm, so copy the array before comparing prototypes.
  assert.deepEqual(Array.from(exports.inject), ['slots'])
  assert.equal(typeof exports.apply, 'function')

  const injections = []
  const registrations = []
  exports.apply({
    slots: {
      inject(name, register) {
        injections.push(name)
        return register()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  })

  assert.deepEqual(injections, ['shell.overlay'])
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].options.name, 'shell.overlay')
  assert.equal(registrations[0].options.id, 'deepseek-time')
  assert.equal(registrations[0].options.order, 20)
  assert.equal(typeof registrations[0].component, 'function')

  const tree = registrations[0].component()
  assert.equal(tree.type, 'aside')
  assert.equal(tree.props.role, 'status')
  assert.match(tree.props['aria-label'], /\d{2}:\d{2}:\d{2}/)
  assert.equal(tree.props.style.position, 'fixed')

  const nodes = [...walk(tree)]
  assert.ok(nodes.some((node) => node.type === 'svg'), 'the DeepSeek mark must render')
  assert.ok(nodes.some((node) => node.type === 'path' && typeof node.props.d === 'string' && node.props.d.length > 0))
  assert.ok(nodes.some((node) => node.type === 'span' && /^\d{2}:\d{2}:\d{2}$/.test(node.props.children)))
})

test('DSH host entry registers the same-origin balance route', async () => {
  const host = await import(pathToFileURL(join(adapterDir, 'lib', 'index.js')).href)
  assert.equal(host.name, 'deepseek-time')
  assert.deepEqual(host.inject, ['webServer', 'credentials'])
  assert.equal(typeof host.apply, 'function')

  const routes = []
  const disposers = []
  const effectDisposers = []
  const credentials = { value: 'test-key', resolve: async () => ({ value: 'test-key' }) }
  const ctx = {
    credentials,
    webServer: {
      register(route) {
        routes.push(route)
        return () => disposers.push('route')
      },
    },
    effect(setup) {
      effectDisposers.push(setup())
      return () => {}
    },
  }

  host.apply(ctx)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].kind, 'exact')
  assert.equal(routes[0].path, '/deepseek-time/balance.json')
  assert.equal(typeof routes[0].handler, 'function')

  const respond = () => {
    const result = { status: undefined, body: undefined, headers: undefined }
    const res = {
      writeHead(status, headers) {
        result.status = status
        result.headers = headers
      },
      end(body) {
        result.body = body === undefined ? undefined : JSON.parse(body)
      },
    }
    return { result, res }
  }

  const originalFetch = globalThis.fetch
  const originalResolve = credentials.resolve
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      is_available: true,
      balance_infos: [
        { currency: 'USD', total_balance: '1.00' },
        { currency: 'CNY', total_balance: '12.34' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })

    const ok = respond()
    await routes[0].handler({ method: 'GET', headers: { host: '127.0.0.1:7837' } }, ok.res)
    assert.equal(ok.result.status, 200)
    assert.equal(ok.result.body.ok, true)
    assert.equal(ok.result.body.totalBalance, 12.34)
    assert.equal(ok.result.body.currency, 'CNY')
    assert.equal(ok.result.headers['Cache-Control'], 'no-store')

    const crossOrigin = respond()
    await routes[0].handler({ method: 'GET', headers: { host: '127.0.0.1:7837', origin: 'https://evil.example' } }, crossOrigin.res)
    assert.equal(crossOrigin.result.status, 403)
    assert.equal(crossOrigin.result.body.code, 'forbidden')

    const wrongMethod = respond()
    await routes[0].handler({ method: 'POST', headers: { host: '127.0.0.1:7837' } }, wrongMethod.res)
    assert.equal(wrongMethod.result.status, 403)

    credentials.resolve = async () => undefined
    const missing = respond()
    await routes[0].handler({ method: 'GET', headers: { host: '127.0.0.1:7837' } }, missing.res)
    assert.equal(missing.result.status, 200)
    assert.deepEqual(missing.result.body, { ok: false, code: 'credential-missing' })

    credentials.resolve = async () => {
      throw new Error('credentials unavailable')
    }
    const unavailable = respond()
    await routes[0].handler({ method: 'GET', headers: { host: '127.0.0.1:7837' } }, unavailable.res)
    assert.deepEqual(unavailable.result.body, { ok: false, code: 'credential-unavailable' })

    credentials.resolve = async () => ({ value: 'test-key' })
    globalThis.fetch = async () => new Response('nope', { status: 502 })
    const upstream = respond()
    await routes[0].handler({ method: 'GET', headers: { host: '127.0.0.1:7837' } }, upstream.res)
    assert.deepEqual(upstream.result.body, { ok: false, code: 'upstream-unavailable' })

    globalThis.fetch = async () => new Response(JSON.stringify({ balance_infos: [] }), { status: 200 })
    const invalid = respond()
    await routes[0].handler({ method: 'GET', headers: { host: '127.0.0.1:7837' } }, invalid.res)
    assert.deepEqual(invalid.result.body, { ok: false, code: 'invalid-response' })
  } finally {
    globalThis.fetch = originalFetch
    credentials.resolve = originalResolve
  }

  for (const dispose of effectDisposers) {
    if (typeof dispose === 'function') dispose()
  }
  assert.equal(effectDisposers.length, 1, 'the route must be disposed with the plugin fiber')
  assert.deepEqual(disposers, ['route'])
})
