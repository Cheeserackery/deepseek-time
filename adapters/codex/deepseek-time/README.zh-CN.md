# DeepSeek Time Codex 适配器

此目录是 Codex 插件，提供 `show_deepseek_time` MCP 工具和实时状态卡。插件会在宿主支持时请求画中画展示；不支持画中画的 Codex 宿主可能将状态卡显示在对话内。它不是永久全局悬浮层。

## 从本仓库安装

仓库包含 `.agents/plugins/marketplace.json`。从克隆后的仓库根目录执行：

```powershell
codex plugin marketplace add '<仓库路径>'
codex plugin add deepseek-time@deepseek-time
```

安装后新建一个 Codex 任务，再调用 `show_deepseek_time`。Codex 适配器不需要额外构建，marketplace 条目会直接指向本目录。

## 更新与卸载

插件修改后，从同一个本地 marketplace 重新安装，并新建任务测试。卸载时使用当前 Codex 版本对应的插件移除命令，或在 Codex 设置中禁用/移除该 marketplace。仓库 marketplace 只是本地元数据，不会自动发布到 Codex 官方插件目录。

## 兼容性说明

- MCP App 是否获得画中画展示由 Codex 宿主决定。
- MCP 服务读取本地时间；调用 `show_deepseek_time` 时，如果 MCP 进程环境中显式提供了 `DEEPSEEK_API_KEY`，会查询官方 DeepSeek 余额接口并在工具结果/状态卡中显示余额。API Key 不会返回给卡片。Codex 没有向插件公开读取宿主内部凭据的接口，因此需要在 MCP 进程配置中显式提供该环境变量。
- 插件使用共享的北京时间规则，项目采用 MIT 开源协议。
