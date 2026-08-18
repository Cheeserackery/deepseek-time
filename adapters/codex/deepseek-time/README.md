# DeepSeek Time Codex Adapter

This directory is the Codex plugin. It provides the `show_deepseek_time` MCP tool and a live status card. The plugin requests picture-in-picture presentation when the host supports it; Codex hosts without that presentation mode may show the card inline instead. It is not a permanent global overlay.

## Install From This Repository

The repository includes `.agents/plugins/marketplace.json`. From the cloned repository root, add the local marketplace and install the plugin:

```powershell
codex plugin marketplace add '<clone-path>'
codex plugin add deepseek-time@deepseek-time
```

Start a new Codex task after installation, then call `show_deepseek_time`. The marketplace entry points to this directory, so no separate build step is required for the Codex adapter.

## Update and Remove

After changing the plugin, reinstall it from the same local marketplace and start a new task. To remove it, use the Codex plugin removal command for your installed Codex version, or disable/remove this marketplace entry from Codex settings. The repository marketplace is local metadata; it does not publish the plugin to Codex' global catalog.

## Compatibility Notes

- Codex controls whether MCP App cards receive picture-in-picture presentation.
- The MCP server reads local time only and exposes no network service.
- The plugin follows the shared Beijing-time rules and is distributed under the MIT License.
