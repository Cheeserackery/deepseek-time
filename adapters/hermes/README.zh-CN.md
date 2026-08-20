# DeepSeek Time Hermes 适配器

这是 Hermes Desktop 的单文件磁盘插件。它使用 Hermes 原生左侧状态栏插槽，显示当前 DeepSeek 定价时段和倒计时；不会改变输入框、侧边栏或窗口布局，也不支持拖动。

## 安装

在仓库根目录构建生成文件：

```powershell
npm run build
npm run verify
```

将生成的文件复制到 Hermes 桌面插件目录：

```powershell
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:HERMES_HOME)) { throw '请先设置 HERMES_HOME，或使用 Hermes 文档指定的插件目录。' }
$pluginDir = Join-Path $env:HERMES_HOME 'desktop-plugins\deepseek-time'
New-Item -ItemType Directory -Force $pluginDir | Out-Null
Copy-Item -LiteralPath 'adapters\hermes\plugin.js' -Destination (Join-Path $pluginDir 'plugin.js') -Force
```

然后重新加载 Hermes 插件或重启 Hermes。如果未设置 `HERMES_HOME`，请使用当前 Hermes 安装文档指定的桌面插件目录。

## 更新与卸载

更新时重新运行构建并覆盖 `plugin.js`，然后重新加载 Hermes。卸载时删除插件目录并重新加载：

```powershell
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:HERMES_HOME)) { throw '卸载前请先设置 HERMES_HOME。' }
$pluginDir = Join-Path $env:HERMES_HOME 'desktop-plugins\deepseek-time'
if (Test-Path -LiteralPath $pluginDir) { Remove-Item -LiteralPath $pluginDir -Recurse -Force }
```

该插件是本地磁盘插件，可能不会出现在 Hermes 可搜索的 marketplace 列表中；通过桌面插件目录中的文件控制安装和卸载。

## 兼容性

生成的 `plugin.js` 运行时自包含，不需要额外 npm 依赖。它使用共享的北京时间规则，项目采用仓库根目录声明的 MIT 协议。Hermes 磁盘插件 SDK 没有公开安全读取宿主 DeepSeek 凭据的接口，因此本适配器有意只显示时段和倒计时，不要求用户把 Key 粘贴到插件中。
