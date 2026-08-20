# DeepSeek Time Hermes Adapter

This is the self-contained Hermes Desktop disk plugin. It registers a native left status-bar contribution and shows the current DeepSeek pricing period plus its countdown. It does not change the composer, sidebar, or window layout, and it has no drag behavior.

## Install

From the repository root, build the generated plugin:

```powershell
npm run build
npm run verify
```

Copy the generated file to Hermes' desktop plugin directory:

```powershell
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:HERMES_HOME)) { throw 'Set HERMES_HOME or use the plugin directory documented by Hermes.' }
$pluginDir = Join-Path $env:HERMES_HOME 'desktop-plugins\deepseek-time'
New-Item -ItemType Directory -Force $pluginDir | Out-Null
Copy-Item -LiteralPath 'adapters\hermes\plugin.js' -Destination (Join-Path $pluginDir 'plugin.js') -Force
```

Reload Hermes Desktop plugins or restart Hermes. If `HERMES_HOME` is not set, use the desktop plugin directory documented by your Hermes installation.

## Update and Remove

To update, rebuild and copy `plugin.js` again, then reload Hermes. To remove it, delete the `deepseek-time` plugin directory and reload Hermes:

```powershell
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:HERMES_HOME)) { throw 'Set HERMES_HOME before removing the plugin.' }
$pluginDir = Join-Path $env:HERMES_HOME 'desktop-plugins\deepseek-time'
if (Test-Path -LiteralPath $pluginDir) { Remove-Item -LiteralPath $pluginDir -Recurse -Force }
```

The plugin may not appear in Hermes' searchable marketplace list because this is a local disk plugin. Installation and removal are controlled by the file in the desktop plugin directory.

## Compatibility

The generated `plugin.js` is self-contained and does not require npm dependencies at runtime. It uses the shared Beijing-time rules and the MIT License in the repository root. Hermes' disk plugin SDK does not expose a safe API for reading the host's stored DeepSeek credential, so this adapter intentionally shows time status only and never asks users to paste a key into the plugin.
