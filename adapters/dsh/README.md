# DeepSeek Time DSH Adapter

This package is the DeepSeek Harness (DSH) adapter for DSH `0.2.2-rc.1` and later `0.2.x` releases. It registers the indicator into the frame-wide `shell.overlay` slot declared by `@deepseek-ai/dsh-client-ui-layout`, so the pill stays mounted across sessions (including the blank New Session screen) and outside every scroll container. The default position sits just right of the sidebar near the bottom of the window; pointer dragging is clamped to the window and the last position is remembered in the browser profile. Double-click the pill to return to the default position.

Registering into `shell.overlay` is the documented seat for a frame-wide status pill: the floating layer is click-through, and each entry opts back into pointer events, so the indicator never blocks the app underneath.

On hover or keyboard focus the pill shows a detail card (pricing period, next boundary in Beijing time, account balance) and requests a fresh balance through a DSH Host-side route. The Host resolves `DEEPSEEK_API_KEY` through DSH's credentials service and calls only `https://api.deepseek.com/user/balance`; the key never enters the browser or plugin UI. Simultaneous hover requests are coalesced while one request is in flight, but completed results are not cached. If no key is configured or the upstream request fails, the indicator continues to show the time period and displays a short balance status.

## Package Contract

The manifest declares the DSH `0.2.x` plugin contract:

- `dsh.manifestVersion: 1` and `engines.dsh: "^0.2.2-rc.1"` — DSH 0.2.2-rc.1 and later `0.2.x` releases accept the plugin; older releases refuse it instead of loading an incompatible client bundle.
- `dsh.client` — a Web client entry that injects `@deepseek-ai/dsh-client-ui-layout` before materializing, and loads immediately at boot so the pill appears without opening a session.
- `dsh.bundle.patch` — selects the `deepseek-time` Loader row through `cordis.patch.yml`.
- `icon` plus `locale/en.json` / `locale/zh.json` — title, description, and detail document read by the DSH plugin manager.

## Build

Run these commands from the repository root after cloning it:

```powershell
npm run build
npm run verify
```

The build generates `lib/client.js`, `lib/index.js`, `icon.svg`, and the shared modules under `src/`. Do not edit generated files manually. Keep `lib/index.js`: it is the Host entry that registers the balance route; removing it is a startup error rather than a client-only opt-out.

## Install Into DSH

The Web profile directory is usually `<DSH_HOME>\profiles\<profile>` (for the desktop app, `%DSH_HOME%\profiles\desktop`). From that directory, add the adapter package with pnpm and then select the bundle:

```powershell
pnpm add "file:<clone-path>\adapters\dsh"
pnpm install
```

Then edit the profile's `package.json` and add `deepseek-time` once to the existing `dsh.profile.bundles` list:

```json
{
  "dsh": { "profile": { "bundles": ["existing bundle", "deepseek-time"] } },
  "dependencies": { "deepseek-time": "file:<clone-path>/adapters/dsh" }
}
```

Add these entries to the existing object; do not replace the profile's other bundles or dependencies. `pnpm add` adds the dependency but does not select the bundle automatically. Restart DSH after the edit.

You can also enable or disable the installed bundle afterwards from **Settings → Plugins** in DSH; the plugin manager writes the same `dsh.profile.bundles` selection. When DSH upgrades, check that the plugin is still enabled there: a version outside the declared `engines.dsh` range is refused rather than silently loaded.

To remove the adapter, first delete `deepseek-time` from `dsh.profile.bundles` (or disable it in the plugin manager), then run `pnpm remove deepseek-time` and `pnpm install`, and restart DSH.

## Compatibility Notes

- Requires DSH `0.2.2-rc.1` or a later `0.2.x` release. The adapter relies on the `shell.overlay` slot declared by `@deepseek-ai/dsh-client-ui-layout`; it does not patch DSH application source and injects no global CSS.
- Positioning reads only two documented DOM facts: the `data-shell-overlay` layer attribute and the sidebar's grid seat. It follows sidebar collapse, drawer mode, and window resizes.
- The resident indicator keeps the original chrome-free look: only the DeepSeek mark and the colored countdown sit on the app surface, with no card background, border, or shadow. The hover card uses DSH theme variables with fallbacks, so it follows light and dark themes.
- Balance display requires `DEEPSEEK_API_KEY` to be configured in DSH's models/credentials settings. No key is placed in `package.json`, source files, browser storage, or the repository.
- The drag position is browser-profile state. Clearing site data resets it to the default location outside the sidebar.
- Time rules are shared and always use Beijing time: weekday peak `09:00-12:00` and `14:00-18:00` (Monday-Friday); weekends are idle all day.
- If DSH reports the plugin as incompatible after an upgrade, update this adapter first. Only for a trusted, reviewed build, grant the exact-version exemption with `dsh plugin allow-version` or the plugin manager.
- The project is distributed under the MIT License. See the repository root `LICENSE` file.
