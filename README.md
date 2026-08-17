# DeepSeek Time

DeepSeek Time is a fixed-position status indicator for DeepSeek's published pricing periods. It always evaluates time in `Asia/Shanghai`: peak is `09:00-12:00` and `14:00-18:00`; all other time is idle.

The supplied SVG is the source icon. The display uses its original blue in idle periods and red in peak periods. The countdown updates on each second boundary.

## Layout

- `packages/core/`: one tested source of truth for pricing-period state and color.
- `adapters/harness/`: DeepSeek Harness Web-client source using its native input dock slot above the composer.
- `adapters/hermes/`: Hermes Desktop disk plugin using its native left status-bar contribution.
- `adapters/codex/deepseek-time/`: Codex plugin with a local MCP App status card that requests picture-in-picture presentation.

## Development

```powershell
npm run build
npm run verify
```

`npm run build` stages generated core files beside the adapters. Run it after changing the shared core or supplied SVG.

## Installation Notes

Hermes: run `npm run build`, then copy only `adapters/hermes/plugin.js` to `$HERMES_HOME/desktop-plugins/deepseek-time/plugin.js` and reload desktop plugins. The generated disk plugin is self-contained, as required by Hermes Desktop, and its widget is fixed in the left side of the bottom status bar, without changing the composer layout.

DeepSeek Harness: see `adapters/harness/README.md`. Its preview client-plugin protocol requires the adapter to be built in a Harness source checkout.

Codex: add this repository as a marketplace, install `deepseek-time@deepseek-time`, then invoke `show_deepseek_time` in a new task. Its MCP App requests picture-in-picture; hosts that do not provide this mode retain the same live status card inline.

## GitHub Distribution

This repository is self-contained and can be published directly to GitHub. Consumers should clone it, run `npm run build`, and follow the Hermes or Harness installation notes above. The GitHub repository itself does not automatically register a local desktop plugin in either product's in-app search catalog; catalog integration requires a separate marketplace submission by the corresponding product.
