# DeepSeek Time

[中文](README.md) | [English](README.en.md)

DeepSeek Time 是一个开源的 DeepSeek 定价时段状态指示器。程序始终使用北京时间（`Asia/Shanghai`），在空闲时段显示蓝色图标，在高峰时段显示红色图标，并实时倒计时到下一个时段边界。

适用于DeepSeek Harness、Hermes、Codex。（但Codex端无法实现常驻显示，故不推荐在Codex中使用）

当前规则：

- 高峰时段：`09:00-12:00`、`14:00-18:00`
- 空闲时段：其余时间

DeepSeek 的价格和时段可能调整，使用前请查看官方页面：<https://api-docs.deepseek.com/zh-cn/quick_start/pricing/>。

<img width="1190" height="1718" alt="DS-TIME示例图 拷贝" src="https://github.com/user-attachments/assets/a33a5293-f005-4f08-b2e7-13d715c4e016" />

## 三端适配器

三端共享 `packages/core/` 中经过测试的时间逻辑，但安装方式分别遵循宿主产品的插件规范：

- `adapters/hermes/`：Hermes Desktop 单文件磁盘插件，显示在原生左侧状态栏，不影响输入框。
- `adapters/dsh/`：DeepSeek Harness（DSH）Web 客户端包，使用原生会话输入插槽，图标固定在侧边栏外侧靠近底部，并跟随侧栏缩放和收起更新。
- `adapters/codex/deepseek-time/`：Codex 插件，提供 `show_deepseek_time` MCP 工具和实时状态卡；画中画是否显示由 Codex 宿主决定。

## 构建与验证

要求 Node.js 20 或更高版本和 npm；Hermes、DSH 安装还需要各自支持的包管理器。

```powershell
npm run build
npm run verify
```

`npm run build` 会生成共享模块、图标路径、Hermes 单文件插件和 DSH 客户端包。不要手动编辑适配器 `lib/` 或生成的 `src/` 文件；修改源模板或共享核心后重新构建。

## 安装 Hermes Desktop

1. 克隆仓库并运行 `npm run build`。
2. 将 `adapters/hermes/plugin.js` 复制为 Hermes 桌面插件目录中的 `deepseek-time/plugin.js`：

```powershell
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:HERMES_HOME)) { throw '请先设置 HERMES_HOME，或使用 Hermes 文档指定的插件目录。' }
$pluginDir = Join-Path $env:HERMES_HOME 'desktop-plugins\deepseek-time'
New-Item -ItemType Directory -Force $pluginDir | Out-Null
Copy-Item -LiteralPath 'adapters\hermes\plugin.js' -Destination (Join-Path $pluginDir 'plugin.js') -Force
```

3. 重新加载 Hermes 插件或重启 Hermes。如果没有设置 `HERMES_HOME`，请使用 Hermes 安装文档指定的插件目录。

更新时重新构建并覆盖 `plugin.js`，再重新加载 Hermes。卸载时删除 `deepseek-time` 目录并重新加载。因为这是本地磁盘插件，所以可能不会出现在 Hermes 的可搜索 marketplace 列表中。

## 安装 DeepSeek Harness（DSH）

1. 克隆仓库并运行 `npm run build`。
2. 在 DSH Web profile 目录执行以下命令，将 `<仓库路径>` 替换为实际克隆路径：

```powershell
pnpm add "file:<仓库路径>\adapters\dsh"
pnpm install
```

3. 编辑 DSH Web profile 目录下的 `package.json`，在现有 `dsh.profile.bundles` 数组中加入一次 `deepseek-time`，并保留数组中的其他 bundle。`pnpm add` 只会添加依赖，不会自动把 bundle 加入该数组。确认依赖和 bundle 同时存在后，再运行 `pnpm install` 并重启 DSH。包内的 `dsh.client` 和 `dsh.bundle` 元数据会提供客户端和 Loader 注册。

配置结构应类似下面这样；只添加条目，不要覆盖 profile 原有内容：

```json
{
  "dsh": { "profile": { "bundles": ["已有 bundle", "deepseek-time"] } },
  "dependencies": { "deepseek-time": "file:<仓库路径>/adapters/dsh" }
}
```

从旧版本升级时，将 profile `package.json` 中依赖值里的 `adapters/harness` 改为 `adapters/dsh`，不要保留旧路径，然后运行 `pnpm install`。更新时重新运行 `npm run build`，重复上述安装命令并重启 DSH。必须保留 `adapters/dsh/lib/index.js`、包根导出、`main` 和 `cordis.patch.yml`，它们用于保证 DSH 安全加载。

卸载时先从 `dsh.profile.bundles` 数组删除 `deepseek-time`，再执行 `pnpm remove deepseek-time` 和 `pnpm install`，最后重启 DSH；不要留下指向已删除包的 bundle 条目。

DSH 适配器要求宿主提供原生 `conversation.input.dock` 插槽，不会修改 DSH 源码或注入全局 CSS。

## 安装 Codex

仓库包含本地 marketplace：`.agents/plugins/marketplace.json`。从仓库根目录执行：

```powershell
codex plugin marketplace add '<仓库路径>'
codex plugin add deepseek-time@deepseek-time
```

安装后新建 Codex 任务并调用 `show_deepseek_time`。更新时从同一个本地 marketplace 重新安装，并新建任务测试；卸载时使用当前 Codex 版本支持的移除命令，或在 Codex 设置中禁用/移除该 marketplace。

Codex 宿主决定 MCP App 是否获得画中画展示。插件会请求画中画，但不支持的宿主可能以内嵌状态卡显示。Codex 没有 Hermes/DSH 那样的永久全局 UI 插槽，因此该适配器由工具调用触发，不是应用启动时自动悬浮。

## 故障排查

- 源码修改后插件不更新：先运行 `npm run build`，再重新安装对应适配器。
- DSH 启动失败：检查 `main`、根导出、`lib/index.js` 和 `dsh.bundle` 是否完整；纯客户端包不能省略空宿主入口。
- 应用内搜索不到插件：按照本 README 的本地安装方式操作。放到 GitHub 或本地 marketplace 不会自动加入产品官方插件目录。
- DeepSeek 调整定价规则后：以官方页面为准，并同步更新共享核心及测试。

## 开发

共享逻辑位于 `packages/core/src/time-state.mjs`，边界和倒计时测试位于 `tests/`：

```powershell
npm run verify
```

提交代码时应包含重新生成的适配器产物，不要提交密钥、机器专属 profile 路径或已安装产品目录。

## 开源协议

本项目采用 MIT 开源协议，详见根目录 [LICENSE](LICENSE)。
