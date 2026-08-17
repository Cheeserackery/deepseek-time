# DeepSeek Harness Adapter

This is a DeepSeek Harness Web client plugin. It registers in the native `conversation.composer.dock` slot, placing the status display at the lower left of the conversation composer.

Harness currently requires client plugins to be built within a source checkout. Copy this adapter into the Harness workspace as a local client package, add it to the workspace and to the Web profile's `cordis.yml`, then build the client bundle so `./lib/client.js` exists. The package metadata declares the `dsh.client` entry required by the Harness client-module loader.

Run `npm run build` in this repository after changing the shared core. It stages `time-state.mjs` and the generated SVG path module beside `src/client.tsx`.

For an already installed DSH profile, the generated package can be installed without a source checkout: copy `package.json` and `lib/client.js` into the profile's shared `node_modules/deepseek-time/` directory, then add `{ id: 'deepseek-time', name: 'deepseek-time' }` to the profile's `cordis.patch.yml` insert list. The next DSH launch scans the package's `dsh.client` metadata and loads its bundled client module.
