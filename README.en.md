# DeepSeek Time

[中文](README.md) | [English](README.en.md)

DeepSeek Time is an open-source status indicator for DeepSeek's published pricing periods. It evaluates Beijing time (`Asia/Shanghai`), switches the DeepSeek mark between idle blue and peak red, and shows a live countdown to the next boundary.

Pricing periods currently implemented:

- Peak: `09:00-12:00` and `14:00-18:00`
- Idle: all other times

Check DeepSeek's official pricing page before relying on these windows: <https://api-docs.deepseek.com/quick_start/pricing>.

## Changelog

### V10 (2026-08-21)

- DSH now supports free dragging and remembers the indicator's last position.
- DSH fetches a fresh DeepSeek API balance on every new hover instead of caching completed results. Concurrent requests are coalesced, with timeout, failure, and missing-credential handling retained.
- DSH performs balance requests on the Host side through its credential service; the API key never enters the browser or GitHub.
- Codex queries the balance when `show_deepseek_time` is called, when `DEEPSEEK_API_KEY` is explicitly supplied to the MCP process.
- Hermes remains time-status-only because its disk-plugin SDK does not expose a safe API for reading internal credentials.

## Supported Adapters

The adapters share the tested core in `packages/core/`, but each host has its own package format and installation path.

- `adapters/hermes/`: Hermes Desktop self-contained disk plugin. It appears in the native left status bar and does not affect the composer; it currently shows time status only because Hermes does not expose a credential API to disk plugins.
- `adapters/dsh/`: DeepSeek Harness (DSH) Web client package. It uses the native conversation dock, supports a remembered draggable position outside the sidebar, and can query the balance through the DSH credential service on hover.
- `adapters/codex/deepseek-time/`: Codex plugin with the `show_deepseek_time` MCP tool and live status card. Picture-in-picture depends on Codex host support.

## Build And Verify

Requirements: Node.js 20 or newer and npm. Hermes and DSH installation may additionally require their own supported package manager.

```powershell
npm run build
npm run verify
```

`npm run build` stages generated shared modules, the SVG path, the Hermes single-file plugin, and the DSH client bundle. Do not edit generated files under adapter `lib/` or staged `src/` files by hand; edit the source templates and shared core, then rebuild.

## Install Hermes Desktop

1. Clone this repository and run `npm run build`.
2. Copy `adapters/hermes/plugin.js` to Hermes' desktop plugin directory as `deepseek-time/plugin.js`.

```powershell
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:HERMES_HOME)) { throw 'Set HERMES_HOME or use the plugin directory documented by Hermes.' }
$pluginDir = Join-Path $env:HERMES_HOME 'desktop-plugins\deepseek-time'
New-Item -ItemType Directory -Force $pluginDir | Out-Null
Copy-Item -LiteralPath 'adapters\hermes\plugin.js' -Destination (Join-Path $pluginDir 'plugin.js') -Force
```

3. Reload Hermes Desktop plugins or restart Hermes. If `HERMES_HOME` is not set, use the directory documented by your Hermes installation.

To update, rebuild and copy the file again. To uninstall, remove the `deepseek-time` directory and reload Hermes. This is a local disk plugin, so it may not appear in Hermes' searchable marketplace list.

## Install DeepSeek Harness (DSH)

1. Clone this repository and run `npm run build`.
2. From the DSH Web profile directory, add the local DSH package. Replace `<clone-path>` with the absolute path of this checkout:

```powershell
pnpm add "file:<clone-path>\adapters\dsh"
pnpm install
```

3. Edit the DSH Web profile's `package.json` and add `deepseek-time` once to the existing `dsh.profile.bundles` array, preserving all other bundles. `pnpm add` adds the dependency but does not select the DSH bundle automatically. Confirm both the dependency and bundle entry exist, run `pnpm install`, and restart DSH. The package's `dsh.client` and `dsh.bundle` metadata provide the client and Loader registration.

The structure should look like this; add the entries without replacing the profile's existing content:

```json
{
  "dsh": { "profile": { "bundles": ["existing bundle", "deepseek-time"] } },
  "dependencies": { "deepseek-time": "file:<clone-path>/adapters/dsh" }
}
```

When upgrading from an older release, change the profile dependency path from `adapters/harness` to `adapters/dsh` before running `pnpm install`; do not keep the old path. For updates, run `npm run build`, repeat the local `pnpm add`/`pnpm install` steps, and restart DSH. Keep `adapters/dsh/lib/index.js`, the package root export, `main`, and `cordis.patch.yml`; these are required for safe DSH startup.

To remove the adapter, first delete `deepseek-time` from the `dsh.profile.bundles` array, then run `pnpm remove deepseek-time`, `pnpm install`, and restart DSH. Do not leave a bundle entry pointing to an uninstalled package.

The DSH adapter requires the host's native `conversation.input.dock` slot. It does not patch DSH source code or inject global CSS. Balance display requires `DEEPSEEK_API_KEY` configured in DSH; the key stays on the Host side and never enters the browser.

## Install Codex

This repository includes a local marketplace at `.agents/plugins/marketplace.json`.

```powershell
codex plugin marketplace add '<clone-path>'
codex plugin add deepseek-time@deepseek-time
```

Start a new Codex task after installation and call `show_deepseek_time`. Updates should be reinstalled from the same marketplace and tested in a new task. Remove the plugin with the removal command supported by your Codex version, or disable/remove this local marketplace in Codex settings.

Codex controls MCP App presentation. The plugin requests picture-in-picture, but a host without that capability may show the live card inline. Codex does not provide the Hermes/DSH-style permanent global UI slot, so this adapter is tool-triggered rather than an always-on overlay. When the MCP process explicitly provides `DEEPSEEK_API_KEY`, the tool queries and returns the balance; the Codex plugin cannot read credentials stored internally by the host.

## Troubleshooting

- If an adapter is missing after a source change, run `npm run build` before reinstalling it.
- If DSH fails to start, restore the package's `main`, root export, `lib/index.js`, and `dsh.bundle` metadata; `lib/index.js` also owns the balance Host route and must not be removed or replaced with a client-only no-op entry.
- If a plugin cannot be found in an in-app search list, use the documented local installation method. Local disk plugins and local marketplaces are not automatically published to a product's official catalog.
- All adapters use the same shared time rules and should be checked against the official pricing page when DeepSeek changes its policy.

## Development

The shared implementation lives in `packages/core/src/time-state.mjs`. Tests cover boundary transitions and countdown formatting:

```powershell
npm run verify
```

Pull requests should include regenerated adapter output and should not include secrets, machine-specific profile paths, or installed-product directories.

## License

DeepSeek Time is released under the MIT License. See [LICENSE](LICENSE).
