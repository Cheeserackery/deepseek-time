# DeepSeek Harness Adapter

This is a DeepSeek Harness Web client plugin. It registers in the native `conversation.input.dock` slot, placing the status display above the conversation input without changing the input height.

Harness currently requires client plugins to be built within a source checkout. Copy this adapter into the Harness workspace as a local client package, add it to the workspace and to the Web profile's `cordis.yml`, then build the client bundle so `./lib/client.js` exists. The package metadata declares the `dsh.client` entry required by the Harness client-module loader.

Run `npm run build` in this repository after changing the shared core. It stages `time-state.mjs` and the generated SVG path module beside `src/client.tsx`.

For an already installed DSH profile, use the official profile plugin command with this package. Its `dsh.bundle` metadata automatically contributes the `deepseek-time` Loader entry; no manual edit to the profile's `cordis.patch.yml` is needed. Keep the generated `lib/index.js` with the package: it is the intentionally empty host entry that lets DSH load this Web client-only bundle safely.
