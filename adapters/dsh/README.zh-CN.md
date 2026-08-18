# DeepSeek Time DSH 适配器

此目录是 DeepSeek Harness（DSH）Web 客户端适配器。插件使用原生 `conversation.input.dock` 插槽，并将图标固定在侧边栏外侧靠近窗口底部的位置；不会改变输入框高度，不支持拖动，并会跟随侧栏缩放、展开和收起更新位置。

## 构建

在仓库根目录执行：

```powershell
npm run build
npm run verify
```

构建会生成 `lib/client.js`、`lib/index.js` 以及 `src/` 下的共享模块。生成文件不要手动编辑。必须保留 `lib/index.js`，它是纯 Web 客户端包所需的空宿主入口，缺失可能导致 DSH 启动失败。

## 安装到 DSH

将仓库克隆到本地后，在 DSH Web profile 目录执行以下命令，把 `<仓库路径>` 替换为实际路径：

```powershell
pnpm add "file:<仓库路径>\adapters\dsh"
pnpm install
```

profile 的 `dsh.profile.bundles` 必须包含 `deepseek-time`。包内的 `dsh.bundle` 和 `dsh.client` 元数据会提供所需注册，不要删除包根导出、`main`、`lib/index.js` 或 `cordis.patch.yml`。安装或更新后重启 DSH。

已有安装更新时，先在仓库根目录运行 `npm run build`，再重复上述 `pnpm add` 和 `pnpm install`，最后重启 DSH。如果插件不显示，请确认 profile 依赖指向本目录且 `lib/client.js` 已生成。

## 卸载

在 DSH Web profile 目录执行：

```powershell
pnpm remove deepseek-time
pnpm install
```

卸载后重启 DSH。

## 兼容性说明

- 这是 DSH Web 客户端插件，不是单独运行的 DSH 宿主插件。
- 共享规则使用北京时间：高峰时段为 `09:00-12:00` 和 `14:00-18:00`，其余为空闲时段。
- DSH 版本需要提供 `conversation.input.dock` 插槽；本适配器不会修改 DSH 源码或注入全局 CSS。
- 项目采用 MIT 开源协议，详见仓库根目录 `LICENSE`。
