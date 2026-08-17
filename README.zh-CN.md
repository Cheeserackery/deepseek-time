# DeepSeek Time

DeepSeek Time 是一个固定位置的状态指示器，用于显示 DeepSeek 官方公布的分时定价时段。

程序始终使用 `Asia/Shanghai`（北京时间）计算：

- 高峰时段：`09:00-12:00`、`14:00-18:00`
- 空闲时段：其余时间

图标在空闲时段显示原始蓝色，在高峰时段切换为红色；倒计时每秒更新，并显示距离下一个时段边界的剩余时间。

## 项目结构

- `packages/core/`：共享的时间规则、倒计时格式化和颜色状态逻辑。
- `adapters/harness/`：DeepSeek Harness Web 客户端插件，使用原生 `conversation.composer.dock` 插槽。
- `adapters/hermes/`：Hermes Desktop 磁盘插件，使用原生左侧状态栏插槽。
- `adapters/codex/deepseek-time/`：Codex 插件，提供 MCP App 状态卡并请求画中画展示。
- `tests/`：共享核心的时段边界和倒计时测试。

三端适配器共享同一套核心规则。修改共享核心或图标后，需要重新运行构建脚本生成适配器文件。

## 开发

```powershell
npm run build
npm run verify
```

`npm run build` 会生成各适配器所需的共享核心文件，并将时间逻辑内联到 Hermes 的单文件插件中。

`npm run verify` 会检查生成文件是否最新，并运行全部测试。

## 安装说明

### Hermes Desktop

运行 `npm run build`，然后将 `adapters/hermes/plugin.js` 复制到：

```text
$HERMES_HOME/desktop-plugins/deepseek-time/plugin.js
```

重新加载 Hermes Desktop 插件。该插件固定显示在窗口左下方的状态栏，不影响输入框或侧边栏，不支持拖动。

### DeepSeek Harness

Harness 官方客户端插件需要在 Harness 源码检出目录中构建。将 `adapters/harness/` 作为本地客户端包加入工作区，并在 Web profile 的 `cordis.yml` 中注册，然后构建客户端 bundle。

具体步骤参见 `adapters/harness/README.md`。

对于已经安装的 DSH profile，应使用 DSH 官方 profile 插件命令安装此包。包内的 `dsh.bundle` 元数据会自动注册 `deepseek-time` Loader 条目，不需要手动修改 profile 的 `cordis.patch.yml`。请保留生成的 `lib/index.js`，它是 DSH 启动时加载此纯 Web 客户端包所需的无操作宿主入口。

下次启动 DSH 时会自动扫描并加载该客户端 bundle。

### Codex

通过个人 marketplace 安装 `adapters/codex/deepseek-time/` 插件。安装后调用 MCP 工具 `show_deepseek_time`，即可显示实时状态。

Codex UI 会请求画中画模式，使状态在继续对话时保持可见。画中画需要宿主支持；不支持的宿主会回退为对话内状态卡。该插件不是应用启动时自动注入的全局悬浮层，必须由工具调用创建状态卡。

## 定价规则来源

当前时段依据 DeepSeek 官方定价页面：

<https://api-docs.deepseek.com/quick_start/pricing>

产品价格和时段可能调整，使用前请以官方页面为准。

## GitHub 发布

本仓库包含共享核心、三端适配器、构建脚本和测试，可以直接发布到 GitHub。使用者克隆仓库后运行 `npm run build`，再按照上面的 Hermes 或 Harness 安装说明操作。

仅将仓库放到 GitHub 不会自动把本地桌面插件加入 Hermes 或 DSH 的应用内搜索目录；若要出现在官方插件列表中，还需要分别向对应产品的 marketplace 提交审核。
