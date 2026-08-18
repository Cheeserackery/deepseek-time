# DeepSeek Time DSH Adapter

This package is the DeepSeek Harness (DSH) Web client adapter. It registers through the native `conversation.input.dock` slot, then fixes the indicator to the outside edge of the sidebar near the bottom of the viewport. The indicator does not change the composer height, does not support dragging, and follows sidebar resize and collapse events.

## Build

Run these commands from the repository root after cloning it:

```powershell
npm run build
npm run verify
```

The build generates `lib/client.js`, `lib/index.js`, and the shared modules under `src/`. Do not edit generated files manually. Keep `lib/index.js`: it is the intentionally empty host entry that allows DSH to load this Web-only package without breaking startup.

## Install Into DSH

DSH loads this package as a local profile bundle. From the DSH Web profile directory, add the adapter package with pnpm, using the path where this repository was cloned:

```powershell
pnpm add "file:<clone-path>\adapters\dsh"
pnpm install
```

Edit the DSH Web profile's `package.json` and add `deepseek-time` once to the existing `dsh.profile.bundles` list. `pnpm add` adds the dependency but does not select the bundle automatically. The package metadata supplies the `dsh.bundle` patch and the `dsh.client` entry; do not remove the package root export, `main`, `lib/index.js`, or `cordis.patch.yml`. Run `pnpm install` after the edit, then restart DSH.

The relevant structure is:

```json
{
  "dsh": { "profile": { "bundles": ["existing bundle", "deepseek-time"] } },
  "dependencies": { "deepseek-time": "file:<clone-path>/adapters/dsh" }
}
```

Add these entries to the existing object; do not replace the profile's other bundles or dependencies.

When migrating from an older release, change the profile dependency path from `adapters/harness` to `adapters/dsh` before running `pnpm install`. For an existing installation, rebuild this repository, run the same `pnpm add` command again, confirm the bundle list, and restart DSH. If the plugin is not visible, check that the profile dependency points to this adapter directory and that the generated `lib/client.js` exists.

## Remove

From the DSH Web profile directory:

```powershell
# First remove "deepseek-time" from dsh.profile.bundles in package.json.
pnpm remove deepseek-time
pnpm install
```

Restart DSH after removal.

## Compatibility Notes

- The adapter is for the DSH Web client, not the DSH host process by itself.
- It uses the shared Beijing-time rules: peak `09:00-12:00` and `14:00-18:00`; all other time is idle.
- The DSH UI must expose `conversation.input.dock`; the adapter does not patch DSH application source or inject global CSS.
- The project is distributed under the MIT License. See the repository root `LICENSE` file.
